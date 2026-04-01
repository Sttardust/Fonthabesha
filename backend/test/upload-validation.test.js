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
});
