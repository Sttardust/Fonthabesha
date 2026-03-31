type RawEnvironment = Record<string, unknown>;

export interface AppEnvironment {
  NODE_ENV: string;
  PORT: number;
  API_PREFIX: string;
  DATABASE_URL: string;
  REDIS_URL: string;
  MEILISEARCH_URL: string;
  MEILISEARCH_API_KEY: string;
  S3_ENDPOINT: string;
  S3_REGION: string;
  S3_ACCESS_KEY_ID: string;
  S3_SECRET_ACCESS_KEY: string;
  S3_BUCKET_RAW: string;
  S3_BUCKET_PUBLIC: string;
  JWT_ACCESS_SECRET: string;
  JWT_REFRESH_SECRET: string;
  APP_BASE_URL: string;
  CDN_BASE_URL: string;
  FRONTEND_URL: string;
  FRONTEND_VERIFY_EMAIL_PATH?: string;
  FRONTEND_RESET_PASSWORD_PATH?: string;
  SMTP_URL?: string;
  MAIL_FROM_EMAIL?: string;
  MAIL_REPLY_TO_EMAIL?: string;
}

function getRequiredString(env: RawEnvironment, key: keyof AppEnvironment, fallback?: string): string {
  const value = env[key] ?? fallback;

  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value.trim();
}

function getPort(env: RawEnvironment): number {
  const rawPort = env.PORT ?? '3000';
  const port = Number(rawPort);

  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error('PORT must be a valid integer between 1 and 65535');
  }

  return port;
}

function getOptionalString(env: RawEnvironment, key: keyof AppEnvironment): string | undefined {
  const value = env[key];

  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function validateEnvironment(env: RawEnvironment): AppEnvironment {
  return {
    NODE_ENV: getRequiredString(env, 'NODE_ENV', 'development'),
    PORT: getPort(env),
    API_PREFIX: getRequiredString(env, 'API_PREFIX', 'api/v1'),
    DATABASE_URL: getRequiredString(env, 'DATABASE_URL'),
    REDIS_URL: getRequiredString(env, 'REDIS_URL'),
    MEILISEARCH_URL: getRequiredString(env, 'MEILISEARCH_URL'),
    MEILISEARCH_API_KEY: getRequiredString(env, 'MEILISEARCH_API_KEY'),
    S3_ENDPOINT: getRequiredString(env, 'S3_ENDPOINT'),
    S3_REGION: getRequiredString(env, 'S3_REGION'),
    S3_ACCESS_KEY_ID: getRequiredString(env, 'S3_ACCESS_KEY_ID'),
    S3_SECRET_ACCESS_KEY: getRequiredString(env, 'S3_SECRET_ACCESS_KEY'),
    S3_BUCKET_RAW: getRequiredString(env, 'S3_BUCKET_RAW'),
    S3_BUCKET_PUBLIC: getRequiredString(env, 'S3_BUCKET_PUBLIC'),
    JWT_ACCESS_SECRET: getRequiredString(env, 'JWT_ACCESS_SECRET'),
    JWT_REFRESH_SECRET: getRequiredString(env, 'JWT_REFRESH_SECRET'),
    APP_BASE_URL: getRequiredString(env, 'APP_BASE_URL'),
    CDN_BASE_URL: getRequiredString(env, 'CDN_BASE_URL'),
    FRONTEND_URL: getRequiredString(env, 'FRONTEND_URL', 'http://localhost:5173'),
    FRONTEND_VERIFY_EMAIL_PATH: getOptionalString(env, 'FRONTEND_VERIFY_EMAIL_PATH'),
    FRONTEND_RESET_PASSWORD_PATH: getOptionalString(env, 'FRONTEND_RESET_PASSWORD_PATH'),
    SMTP_URL: getOptionalString(env, 'SMTP_URL'),
    MAIL_FROM_EMAIL: getOptionalString(env, 'MAIL_FROM_EMAIL'),
    MAIL_REPLY_TO_EMAIL: getOptionalString(env, 'MAIL_REPLY_TO_EMAIL'),
  };
}
