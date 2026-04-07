const assert = require('node:assert/strict');
const { test } = require('node:test');

const {
  enforceEnvironmentSafety,
  validateEnvironment,
} = require('../dist/src/shared/config/app-env.js');

function buildProductionEnv(overrides = {}) {
  return validateEnvironment({
    NODE_ENV: 'production',
    PORT: '3000',
    API_PREFIX: 'api/v1',
    DATABASE_URL: 'postgresql://postgres:postgres@db.example.internal:5432/fonthabesha',
    REDIS_URL: 'redis://redis.example.internal:6379',
    MEILISEARCH_URL: 'https://search.example.com',
    MEILISEARCH_API_KEY: 'search-secret-key',
    S3_ENDPOINT: 'https://storage.example.com',
    S3_REGION: 'us-east-1',
    S3_ACCESS_KEY_ID: 'access-key',
    S3_SECRET_ACCESS_KEY: 'secret-key',
    S3_BUCKET_RAW: 'fonthabesha-raw',
    S3_BUCKET_PUBLIC: 'fonthabesha-public',
    JWT_ACCESS_SECRET: 'prod-access-secret-1234567890',
    JWT_REFRESH_SECRET: 'prod-refresh-secret-1234567890',
    APP_BASE_URL: 'https://api.example.com',
    CDN_BASE_URL: 'https://cdn.example.com',
    FRONTEND_URL: 'https://app.example.com',
    FRONTEND_VERIFY_EMAIL_PATH: '/verify-email',
    FRONTEND_RESET_PASSWORD_PATH: '/reset-password',
    SMTP_URL: 'smtp://mailer.example.com',
    MAIL_FROM_EMAIL: 'no-reply@example.com',
    MAIL_REPLY_TO_EMAIL: 'support@example.com',
    MAIL_QUEUE_ENABLED: 'true',
    MAIL_QUEUE_CONSUMER_ENABLED: 'false',
    BACKGROUND_JOB_QUEUE_ENABLED: 'true',
    BACKGROUND_JOB_CONSUMER_ENABLED: 'false',
    FONT_PROCESSING_QUEUE_ENABLED: 'true',
    FONT_PROCESSING_CONSUMER_ENABLED: 'false',
    FONT_UPLOAD_MAX_BYTES: '26214400',
    FONT_UPLOAD_MAX_FILES_PER_SUBMISSION: '24',
    FONT_UPLOAD_INIT_LIMIT_PER_HOUR: '50',
    FONT_UPLOAD_COMPLETE_LIMIT_PER_HOUR: '80',
    ALLOW_DEV_HEADER_AUTH: 'false',
    ...overrides,
  });
}

test('production safety accepts hardened configuration', () => {
  assert.doesNotThrow(() => {
    enforceEnvironmentSafety(buildProductionEnv());
  });
});

test('production safety rejects insecure development header auth', () => {
  assert.throws(
    () => enforceEnvironmentSafety(buildProductionEnv({ ALLOW_DEV_HEADER_AUTH: 'true' })),
    /ALLOW_DEV_HEADER_AUTH must be false/i,
  );
});

test('production safety rejects preview mail fallback', () => {
  assert.throws(
    () => enforceEnvironmentSafety(buildProductionEnv({ SMTP_URL: '' })),
    /SMTP_URL is required/i,
  );
});

test('production safety rejects placeholder jwt secrets', () => {
  assert.throws(
    () =>
      enforceEnvironmentSafety(
        buildProductionEnv({
          JWT_ACCESS_SECRET: 'replace-me-access',
        }),
      ),
    /JWT_ACCESS_SECRET must be rotated/i,
  );
});

test('production safety rejects localhost-facing urls', () => {
  assert.throws(
    () =>
      enforceEnvironmentSafety(
        buildProductionEnv({
          FRONTEND_URL: 'http://localhost:5173',
        }),
      ),
    /must not use localhost/i,
  );
});
