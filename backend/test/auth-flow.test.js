const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');

const {
  closeTestContext,
  createTestContext,
  forwardedFor,
  requestJson,
  uniqueEmail,
} = require('./helpers/app');
const { fetchMailPreviewToken, login } = require('./helpers/auth');

let context;

before(async () => {
  context = await createTestContext();
});

after(async () => {
  await closeTestContext(context);
});

test('contributor can register, verify email, reset password, and change password', async () => {
  const contributorEmail = uniqueEmail('auth-flow');
  const initialPassword = 'ContributorPass123!';
  const resetPassword = 'ResetPass123!';
  const changedPassword = 'ChangedPass123!';

  const registerResponse = await requestJson(context, {
    method: 'POST',
    path: '/api/v1/auth/register',
    headers: {
      'x-forwarded-for': forwardedFor('auth-flow-register'),
    },
    body: {
      email: contributorEmail,
      password: initialPassword,
      displayName: 'Auth Flow Contributor',
      legalFullName: 'Auth Flow Contributor',
      countryCode: 'ET',
      organizationName: 'Fonthabesha Tests',
      phoneNumber: '+251900000000',
    },
  });

  assert.equal(registerResponse.status, 201);

  assert.equal(registerResponse.body.user.email, contributorEmail);
  assert.equal(registerResponse.body.emailVerificationRequired, true);
  assert.match(registerResponse.body.emailDelivery, /^(queued|preview|smtp)$/);

  const contributorAccessToken = registerResponse.body.accessToken;

  const meBeforeVerification = await requestJson(context, {
    method: 'GET',
    path: '/api/v1/auth/me',
    headers: {
      authorization: `Bearer ${contributorAccessToken}`,
    },
  });

  assert.equal(meBeforeVerification.status, 200);

  assert.equal(meBeforeVerification.body.email, contributorEmail);
  assert.equal(meBeforeVerification.body.emailVerifiedAt, null);

  const emailVerificationToken = await fetchMailPreviewToken(context, {
    to: contributorEmail,
    kind: 'email_verification',
  });

  const confirmEmailResponse = await requestJson(context, {
    method: 'POST',
    path: '/api/v1/auth/email/verification/confirm',
    body: {
      token: emailVerificationToken,
    },
  });

  assert.equal(confirmEmailResponse.status, 201);

  assert.equal(confirmEmailResponse.body.success, true);

  const meAfterVerification = await requestJson(context, {
    method: 'GET',
    path: '/api/v1/auth/me',
    headers: {
      authorization: `Bearer ${contributorAccessToken}`,
    },
  });

  assert.equal(meAfterVerification.status, 200);

  assert.ok(meAfterVerification.body.emailVerifiedAt);

  const requestResetResponse = await requestJson(context, {
    method: 'POST',
    path: '/api/v1/auth/password/reset/request',
    headers: {
      'x-forwarded-for': forwardedFor('auth-flow-reset-request'),
    },
    body: {
      email: contributorEmail,
    },
  });

  assert.equal(requestResetResponse.status, 201);

  assert.equal(requestResetResponse.body.success, true);
  assert.match(String(requestResetResponse.body.expiresInMinutes), /^\d+$/);
  assert.match(String(requestResetResponse.body.emailDelivery), /^(queued|preview|smtp)$/);

  const passwordResetToken = await fetchMailPreviewToken(context, {
    to: contributorEmail,
    kind: 'password_reset',
  });

  const resetConfirmResponse = await requestJson(context, {
    method: 'POST',
    path: '/api/v1/auth/password/reset/confirm',
    body: {
      token: passwordResetToken,
      newPassword: resetPassword,
    },
  });

  assert.equal(resetConfirmResponse.status, 201);

  assert.equal(resetConfirmResponse.body.success, true);
  assert.equal(resetConfirmResponse.body.revokedRefreshSessions, true);

  const contributorTokensAfterReset = await login(context, {
    email: contributorEmail,
    password: resetPassword,
    forwardedFor: forwardedFor('auth-flow-login-after-reset'),
  });

  const changePasswordResponse = await requestJson(context, {
    method: 'POST',
    path: '/api/v1/auth/password/change',
    headers: {
      authorization: `Bearer ${contributorTokensAfterReset.accessToken}`,
    },
    body: {
      currentPassword: resetPassword,
      newPassword: changedPassword,
    },
  });

  assert.equal(changePasswordResponse.status, 201);

  assert.equal(changePasswordResponse.body.success, true);
  assert.equal(changePasswordResponse.body.revokedRefreshSessions, true);

  const refreshResponse = await requestJson(context, {
    method: 'POST',
    path: '/api/v1/auth/refresh',
    body: {
      refreshToken: contributorTokensAfterReset.refreshToken,
    },
  });

  assert.equal(refreshResponse.status, 401);

  const finalLogin = await login(context, {
    email: contributorEmail,
    password: changedPassword,
    forwardedFor: forwardedFor('auth-flow-final-login'),
  });

  assert.ok(finalLogin.accessToken);
  assert.ok(finalLogin.refreshToken);
});
