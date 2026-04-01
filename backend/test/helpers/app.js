require('reflect-metadata');

const { Logger } = require('@nestjs/common');
const {
  CreateBucketCommand,
  HeadBucketCommand,
  S3Client,
} = require('@aws-sdk/client-s3');

async function ensureBucket(client, bucket) {
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
    return;
  } catch {
    await client.send(new CreateBucketCommand({ Bucket: bucket }));
  }
}

async function ensureStorageBuckets() {
  const client = new S3Client({
    region: process.env.S3_REGION || 'us-east-1',
    endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID || 'minioadmin',
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || 'minioadmin',
    },
  });

  await Promise.all([
    ensureBucket(client, process.env.S3_BUCKET_RAW || 'fonthabesha-raw'),
    ensureBucket(client, process.env.S3_BUCKET_PUBLIC || 'fonthabesha-public'),
  ]);
}

async function createTestContext() {
  process.env.MAIL_QUEUE_ENABLED = 'false';
  process.env.BACKGROUND_JOB_QUEUE_ENABLED = 'false';
  Logger.overrideLogger(false);
  await ensureStorageBuckets();
  const { createApp } = require('../../dist/src/bootstrap.js');
  const app = await createApp();
  await app.init();
  await app.listen(0);
  const address = app.getHttpServer().address();

  return {
    app,
    baseUrl: `http://127.0.0.1:${address.port}`,
  };
}

async function closeTestContext(context) {
  await context.app.close();
}

async function requestJson(context, args) {
  const url = new URL(args.path, context.baseUrl);

  if (args.query) {
    Object.entries(args.query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });
  }

  const response = await fetch(url, {
    method: args.method,
    headers: {
      ...(args.body ? { 'content-type': 'application/json' } : {}),
      ...(args.headers ?? {}),
    },
    body: args.body ? JSON.stringify(args.body) : undefined,
  });

  const contentType = response.headers.get('content-type') ?? '';
  const body = contentType.includes('application/json') ? await response.json() : await response.text();

  return {
    status: response.status,
    body,
    headers: response.headers,
  };
}

function uniqueEmail(prefix) {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `${prefix}-${suffix}@example.com`;
}

function forwardedFor(label) {
  const seed = `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const hash = Array.from(seed).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return `10.${hash % 200}.${(hash * 7) % 200}.${(hash * 13) % 200}`;
}

module.exports = {
  closeTestContext,
  createTestContext,
  forwardedFor,
  requestJson,
  uniqueEmail,
};
