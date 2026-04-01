const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');

const {
  closeTestContext,
  createTestContext,
  forwardedFor,
  rawObjectExists,
  requestJson,
  uniqueEmail,
} = require('./helpers/app');
const { buildTestFontBuffer, sha256Hex } = require('./helpers/font');

let context;

before(async () => {
  context = await createTestContext({
    FONT_UPLOAD_MAX_BYTES: 512,
    FONT_UPLOAD_MAX_FILES_PER_SUBMISSION: 1,
  });
});

after(async () => {
  await closeTestContext(context);
});

test('upload policy rejects invalid file types, oversize files, and excess files', async () => {
  const contributorEmail = uniqueEmail('upload-policy');
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
      'x-forwarded-for': forwardedFor('upload-policy-register'),
    },
    body: {
      email: contributorEmail,
      password: contributorPassword,
      displayName: 'Upload Policy Contributor',
      legalFullName: 'Upload Policy Contributor',
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
      familyNameEn: 'Upload Policy Sans',
      declaredLicenseId,
      ownershipEvidenceType: 'ownership_statement',
      ownershipEvidenceValue: 'Created by the automated upload policy test.',
      contributorStatementText:
        'I confirm that I have the legal right to submit this font to the platform for review.',
      termsAcceptanceName: 'Upload Policy Contributor',
      supportsLatin: true,
    },
  });

  assert.equal(createSubmissionResponse.status, 201);
  const submissionId = createSubmissionResponse.body.id;

  const invalidExtensionResponse = await requestJson(context, {
    method: 'POST',
    path: '/api/v1/uploads/init',
    headers: {
      authorization: `Bearer ${contributorAccessToken}`,
    },
    body: {
      submissionId,
      filename: 'malware.exe',
      contentType: 'application/octet-stream',
    },
  });

  assert.equal(invalidExtensionResponse.status, 400);
  assert.match(String(invalidExtensionResponse.body.message), /Unsupported font file extension/i);

  const validInitResponse = await requestJson(context, {
    method: 'POST',
    path: '/api/v1/uploads/init',
    headers: {
      authorization: `Bearer ${contributorAccessToken}`,
    },
    body: {
      submissionId,
      filename: 'upload-policy-regular.ttf',
      contentType: 'font/ttf',
    },
  });

  assert.equal(validInitResponse.status, 201);
  const uploadId = validInitResponse.body.uploadId;
  const uploadStorageKey = validInitResponse.body.upload.storageKey;

  const secondInitResponse = await requestJson(context, {
    method: 'POST',
    path: '/api/v1/uploads/init',
    headers: {
      authorization: `Bearer ${contributorAccessToken}`,
    },
    body: {
      submissionId,
      filename: 'upload-policy-bold.ttf',
      contentType: 'font/ttf',
    },
  });

  assert.equal(secondInitResponse.status, 400);
  assert.match(String(secondInitResponse.body.message), /Submission upload limit reached/i);

  const putResponse = await fetch(validInitResponse.body.upload.url, {
    method: 'PUT',
    headers: {
      'content-type': 'font/ttf',
    },
    body: fontBuffer,
  });

  assert.equal(putResponse.status, 200);

  const oversizeCompleteResponse = await requestJson(context, {
    method: 'POST',
    path: '/api/v1/uploads/complete',
    headers: {
      authorization: `Bearer ${contributorAccessToken}`,
    },
    body: {
      uploadId,
      sha256: sha256Hex(fontBuffer),
    },
  });

  assert.equal(oversizeCompleteResponse.status, 400);
  assert.match(String(oversizeCompleteResponse.body.message), /exceeds the 512 byte limit/i);
  assert.equal(await rawObjectExists(uploadStorageKey), false);
});

test('invalid font content is marked failed and cleaned up after inspection', async () => {
  const contributorEmail = uniqueEmail('invalid-font');
  const contributorPassword = 'ContributorPass123!';
  const invalidFontBuffer = Buffer.from('not-a-real-font-file');

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
      'x-forwarded-for': forwardedFor('invalid-font-register'),
    },
    body: {
      email: contributorEmail,
      password: contributorPassword,
      displayName: 'Invalid Font Contributor',
      legalFullName: 'Invalid Font Contributor',
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
      familyNameEn: 'Invalid Font Sans',
      declaredLicenseId,
      ownershipEvidenceType: 'ownership_statement',
      ownershipEvidenceValue: 'Created by the invalid font test.',
      contributorStatementText:
        'I confirm that I have the legal right to submit this font to the platform for review.',
      termsAcceptanceName: 'Invalid Font Contributor',
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
      filename: 'invalid-font-regular.ttf',
      contentType: 'font/ttf',
    },
  });

  assert.equal(initUploadResponse.status, 201);

  const putResponse = await fetch(initUploadResponse.body.upload.url, {
    method: 'PUT',
    headers: {
      'content-type': 'font/ttf',
    },
    body: invalidFontBuffer,
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
      sha256: sha256Hex(invalidFontBuffer),
    },
  });

  assert.equal(completeUploadResponse.status, 201);
  assert.equal(completeUploadResponse.body.submission.status, 'processing_failed');
  assert.equal(completeUploadResponse.body.upload.processingStatus, 'failed');
  assert.equal(await rawObjectExists(initUploadResponse.body.upload.storageKey), false);

  const detailResponse = await requestJson(context, {
    method: 'GET',
    path: `/api/v1/submissions/${submissionId}`,
    headers: {
      authorization: `Bearer ${contributorAccessToken}`,
    },
  });

  assert.equal(detailResponse.status, 200);
  assert.equal(detailResponse.body.status, 'processing_failed');
  assert.equal(detailResponse.body.analysis.status, 'failed');
  assert.ok(detailResponse.body.analysis.blockingIssues.length >= 1);
  assert.equal(detailResponse.body.review.latestContributorFeedback.action, 'processing_failed');
  assert.match(
    detailResponse.body.review.latestContributorFeedback.notes,
    /Automatic font inspection failed/i,
  );

  const reprocessResponse = await requestJson(context, {
    method: 'POST',
    path: `/api/v1/admin/reviews/${submissionId}/reprocess`,
    headers: {
      'x-user-email': 'admin@fonthabesha.local',
    },
    body: {
      notes: 'Retry the failed submission',
    },
  });

  assert.equal(reprocessResponse.status, 400);
  assert.match(String(reprocessResponse.body.message), /No reprocessable uploads were found/i);
});
