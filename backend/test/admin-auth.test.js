const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');

const {
  closeTestContext,
  createTestContext,
  forwardedFor,
  requestJson,
  uniqueEmail,
} = require('./helpers/app');
const { login } = require('./helpers/auth');

let context;

before(async () => {
  context = await createTestContext();
});

after(async () => {
  await closeTestContext(context);
});

test('admin auth endpoints enforce roles and support lockout management', async () => {
  const contributorEmail = uniqueEmail('admin-auth');
  const contributorPassword = 'ContributorPass123!';

  const registerResponse = await requestJson(context, {
    method: 'POST',
    path: '/api/v1/auth/register',
    headers: {
      'x-forwarded-for': forwardedFor('admin-auth-register'),
    },
    body: {
      email: contributorEmail,
      password: contributorPassword,
      displayName: 'Admin Auth Contributor',
      legalFullName: 'Admin Auth Contributor',
      countryCode: 'ET',
    },
  });

  assert.equal(registerResponse.status, 201);

  const contributorUserId = registerResponse.body.user.id;
  const contributorAccessToken = registerResponse.body.accessToken;

  const forbiddenAuditResponse = await requestJson(context, {
    method: 'GET',
    path: '/api/v1/admin/auth-audit',
    headers: {
      authorization: `Bearer ${contributorAccessToken}`,
    },
  });

  assert.equal(forbiddenAuditResponse.status, 403);

  const authAuditSummaryResponse = await requestJson(context, {
    method: 'GET',
    path: '/api/v1/admin/auth-audit/summary',
    headers: {
      'x-user-email': 'admin@fonthabesha.local',
    },
  });

  assert.equal(authAuditSummaryResponse.status, 200);

  assert.equal(typeof authAuditSummaryResponse.body.totals.allTime, 'number');
  assert.equal(typeof authAuditSummaryResponse.body.actionsLast7d.login, 'number');

  const authSessionsResponse = await requestJson(context, {
    method: 'GET',
    path: '/api/v1/admin/auth-sessions',
    headers: {
      'x-user-email': 'admin@fonthabesha.local',
    },
    query: {
      email: 'admin@fonthabesha.local',
      status: 'active',
    },
  });

  assert.equal(authSessionsResponse.status, 200);

  assert.ok(Array.isArray(authSessionsResponse.body.items));

  const forbiddenPreviewResponse = await requestJson(context, {
    method: 'GET',
    path: '/api/v1/internal/mail/previews',
    headers: {
      authorization: `Bearer ${contributorAccessToken}`,
    },
  });

  assert.equal(forbiddenPreviewResponse.status, 403);

  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const badLoginResponse = await requestJson(context, {
      method: 'POST',
      path: '/api/v1/auth/login',
      headers: {
        'x-forwarded-for': forwardedFor(`admin-auth-bad-login-${attempt}`),
      },
      body: {
        email: contributorEmail,
        password: 'WrongPass123!',
      },
    });

    assert.equal(badLoginResponse.status, 401);
  }

  const lockedLoginResponse = await requestJson(context, {
    method: 'POST',
    path: '/api/v1/auth/login',
    headers: {
      'x-forwarded-for': forwardedFor('admin-auth-bad-login-5'),
    },
    body: {
      email: contributorEmail,
      password: 'WrongPass123!',
    },
  });

  assert.equal(lockedLoginResponse.status, 429);

  const lockoutStatusResponse = await requestJson(context, {
    method: 'GET',
    path: `/api/v1/admin/users/${contributorUserId}/login-lockout`,
    headers: {
      'x-user-email': 'admin@fonthabesha.local',
    },
  });

  assert.equal(lockoutStatusResponse.status, 200);

  assert.equal(lockoutStatusResponse.body.loginLockout.locked, true);
  assert.ok(lockoutStatusResponse.body.loginLockout.retryAfterSeconds > 0);

  const clearLockoutResponse = await requestJson(context, {
    method: 'POST',
    path: `/api/v1/admin/users/${contributorUserId}/login-lockout/clear`,
    headers: {
      'x-user-email': 'admin@fonthabesha.local',
    },
  });

  assert.equal(clearLockoutResponse.status, 201);

  assert.equal(clearLockoutResponse.body.before.locked, true);
  assert.equal(clearLockoutResponse.body.after.locked, false);

  const lockoutStatusAfterClear = await requestJson(context, {
    method: 'GET',
    path: `/api/v1/admin/users/${contributorUserId}/login-lockout`,
    headers: {
      'x-user-email': 'admin@fonthabesha.local',
    },
  });

  assert.equal(lockoutStatusAfterClear.status, 200);

  assert.equal(lockoutStatusAfterClear.body.loginLockout.locked, false);

  const contributorTokens = await login(context, {
    email: contributorEmail,
    password: contributorPassword,
    forwardedFor: forwardedFor('admin-auth-login-after-clear'),
  });

  assert.ok(contributorTokens.accessToken);

  const contributorSessionsResponse = await requestJson(context, {
    method: 'GET',
    path: '/api/v1/admin/auth-sessions',
    headers: {
      'x-user-email': 'admin@fonthabesha.local',
    },
    query: {
      email: contributorEmail,
      status: 'active',
    },
  });

  assert.equal(contributorSessionsResponse.status, 200);
  assert.ok(contributorSessionsResponse.body.items.length >= 1);

  const contributorSessionId = contributorSessionsResponse.body.items[0].id;

  const revokeSingleSessionResponse = await requestJson(context, {
    method: 'POST',
    path: `/api/v1/admin/auth-sessions/${contributorSessionId}/revoke`,
    headers: {
      'x-user-email': 'admin@fonthabesha.local',
    },
  });

  assert.equal(revokeSingleSessionResponse.status, 201);
  assert.equal(revokeSingleSessionResponse.body.sessionId, contributorSessionId);

  await login(context, {
    email: contributorEmail,
    password: contributorPassword,
    forwardedFor: forwardedFor('admin-auth-login-before-bulk-revoke'),
  });

  const revokeUserSessionsResponse = await requestJson(context, {
    method: 'POST',
    path: `/api/v1/admin/users/${contributorUserId}/auth-sessions/revoke`,
    headers: {
      'x-user-email': 'admin@fonthabesha.local',
    },
  });

  assert.equal(revokeUserSessionsResponse.status, 201);
  assert.ok(revokeUserSessionsResponse.body.revokedSessionCount >= 1);

  const authAuditEventsResponse = await requestJson(context, {
    method: 'GET',
    path: '/api/v1/admin/auth-audit',
    headers: {
      'x-user-email': 'admin@fonthabesha.local',
    },
    query: {
      userId: contributorUserId,
      pageSize: 50,
    },
  });

  assert.equal(authAuditEventsResponse.status, 200);

  const auditedActions = new Set(authAuditEventsResponse.body.items.map((event) => event.action));
  assert.ok(auditedActions.has('login_lockout_clear'));
  assert.ok(auditedActions.has('auth_session_revoke'));
  assert.ok(auditedActions.has('auth_user_sessions_revoke'));
});
