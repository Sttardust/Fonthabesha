const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');

const {
  closeTestContext,
  createTestContext,
  forwardedFor,
  requestJson,
  uniqueEmail,
} = require('./helpers/app');
const { buildTestFontBuffer, sha256Hex } = require('./helpers/font');

let context;

before(async () => {
  context = await createTestContext({
    FONT_PROCESSING_QUEUE_ENABLED: true,
    FONT_PROCESSING_CONSUMER_ENABLED: false,
  });
});

after(async () => {
  await closeTestContext(context);
});

test('complete upload queues font processing when the consumer is external', async () => {
  const contributorEmail = uniqueEmail('queue-upload');
  const contributorPassword = 'ContributorPass123!';
  const fontBuffer = buildTestFontBuffer();

  const licensesResponse = await requestJson(context, {
    method: 'GET',
    path: '/api/v1/licenses',
  });

  assert.equal(licensesResponse.status, 200);
  const declaredLicenseId = licensesResponse.body[0].id;

  const registerResponse = await requestJson(context, {
    method: 'POST',
    path: '/api/v1/auth/register',
    headers: {
      'x-forwarded-for': forwardedFor('queue-upload-register'),
    },
    body: {
      email: contributorEmail,
      password: contributorPassword,
      displayName: 'Queued Upload Contributor',
      legalFullName: 'Queued Upload Contributor',
      countryCode: 'ET',
    },
  });

  assert.equal(registerResponse.status, 201);
  const contributorAccessToken = registerResponse.body.accessToken;

  const createSubmissionResponse = await requestJson(context, {
    method: 'POST',
    path: '/api/v1/submissions',
    headers: {
      authorization: `Bearer ${contributorAccessToken}`,
    },
    body: {
      familyNameEn: 'Queued Upload Sans',
      declaredLicenseId,
      ownershipEvidenceType: 'ownership_statement',
      ownershipEvidenceValue: 'Created by the queued upload test contributor.',
      contributorStatementText:
        'I confirm that I have the legal right to submit this font to the platform for review.',
      termsAcceptanceName: 'Queued Upload Contributor',
      supportsLatin: true,
    },
  });

  assert.equal(createSubmissionResponse.status, 201);
  const submissionId = createSubmissionResponse.body.id;

  const initUploadResponse = await requestJson(context, {
    method: 'POST',
    path: '/api/v1/uploads/init',
    headers: {
      authorization: `Bearer ${contributorAccessToken}`,
    },
    body: {
      submissionId,
      filename: 'queued-upload-regular.ttf',
      contentType: 'font/ttf',
    },
  });

  assert.equal(initUploadResponse.status, 201);

  const putResponse = await fetch(initUploadResponse.body.upload.url, {
    method: 'PUT',
    headers: {
      'content-type': 'font/ttf',
    },
    body: fontBuffer,
  });

  assert.equal(putResponse.status, 200);

  const completeUploadResponse = await requestJson(context, {
    method: 'POST',
    path: '/api/v1/uploads/complete',
    headers: {
      authorization: `Bearer ${contributorAccessToken}`,
    },
    body: {
      uploadId: initUploadResponse.body.uploadId,
      sha256: sha256Hex(fontBuffer),
    },
  });

  assert.equal(completeUploadResponse.status, 201);
  assert.equal(completeUploadResponse.body.submission.status, 'processing');
  assert.equal(completeUploadResponse.body.upload.processingStatus, 'queued');

  const detailResponse = await requestJson(context, {
    method: 'GET',
    path: `/api/v1/submissions/${submissionId}`,
    headers: {
      authorization: `Bearer ${contributorAccessToken}`,
    },
  });

  assert.equal(detailResponse.status, 200);
  assert.equal(detailResponse.body.status, 'processing');
  assert.equal(detailResponse.body.analysis.status, 'queued');
  assert.equal(detailResponse.body.analysis.completedUploadCount, 0);
  assert.equal(detailResponse.body.analysis.queuedUploadCount, 1);
  assert.equal(detailResponse.body.permissions.canSubmitForReview, false);
});
