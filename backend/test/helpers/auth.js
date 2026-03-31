const assert = require('node:assert/strict');
const { requestJson } = require('./app');

async function login(context, args) {
  const response = await requestJson(context, {
    method: 'POST',
    path: '/api/v1/auth/login',
    headers: {
      'x-forwarded-for': args.forwardedFor,
    },
    body: {
      email: args.email,
      password: args.password,
    },
  });

  assert.equal(response.status, 201, `Expected login to succeed, got ${response.status}`);

  return {
    accessToken: response.body.accessToken,
    refreshToken: response.body.refreshToken,
  };
}

async function fetchMailPreviewToken(context, args) {
  const timeoutMs = args.timeoutMs ?? 15000;
  const deadline = Date.now() + timeoutMs;
  let lastItems = [];

  while (Date.now() < deadline) {
    const response = await requestJson(context, {
      method: 'GET',
      path: '/api/v1/internal/mail/previews',
      headers: {
        'x-user-email': args.adminEmail ?? 'admin@fonthabesha.local',
      },
    });

    assert.equal(response.status, 200, `Expected mail preview access, got ${response.status}`);

    lastItems = Array.isArray(response.body.items) ? response.body.items : [];

    const item = lastItems.find(
      (preview) => preview.kind === args.kind && preview.to === args.to,
    );

    if (item) {
      const url = new URL(item.actionUrl);
      const token = url.searchParams.get('token');
      assert.ok(token, `Expected token in mail preview URL for ${args.kind}`);
      return token;
    }

    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  throw new Error(
    `Timed out waiting for ${args.kind} preview for ${args.to}. Last previews: ${JSON.stringify(lastItems)}`,
  );
}

module.exports = {
  fetchMailPreviewToken,
  login,
};
