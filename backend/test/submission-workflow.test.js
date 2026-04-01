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
  context = await createTestContext();
});

after(async () => {
  await closeTestContext(context);
});

test('contributor upload flow can be reviewed, approved, and downloaded', async () => {
  const contributorEmail = uniqueEmail('workflow');
  const contributorPassword = 'ContributorPass123!';
  const fontBuffer = buildTestFontBuffer();
  const fontSha = sha256Hex(fontBuffer);

  const licensesResponse = await requestJson(context, {
    method: 'GET',
    path: '/api/v1/licenses',
  });

  assert.equal(licensesResponse.status, 200);
  assert.ok(Array.isArray(licensesResponse.body));
  assert.ok(licensesResponse.body.length >= 1);
  const declaredLicenseId = licensesResponse.body[0].id;

  const registerResponse = await requestJson(context, {
    method: 'POST',
    path: '/api/v1/auth/register',
    headers: {
      'x-forwarded-for': forwardedFor('workflow-register'),
    },
    body: {
      email: contributorEmail,
      password: contributorPassword,
      displayName: 'Workflow Contributor',
      legalFullName: 'Workflow Contributor',
      countryCode: 'ET',
      organizationName: 'Workflow Tests',
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
      familyNameEn: 'Workflow Test Sans',
      declaredLicenseId,
      ownershipEvidenceType: 'ownership_statement',
      ownershipEvidenceValue: 'Created by the workflow test contributor for automated validation.',
      contributorStatementText:
        'I confirm that I have the legal right to submit this font to the platform for review.',
      termsAcceptanceName: 'Workflow Contributor',
      supportsLatin: true,
    },
  });

  assert.equal(createSubmissionResponse.status, 201);
  const submissionId = createSubmissionResponse.body.id;
  const familyId = createSubmissionResponse.body.family.id;
  const familySlug = createSubmissionResponse.body.family.slug;

  const initUploadResponse = await requestJson(context, {
    method: 'POST',
    path: '/api/v1/uploads/init',
    headers: {
      authorization: `Bearer ${contributorAccessToken}`,
    },
    body: {
      submissionId,
      filename: 'workflow-test-sans-regular.ttf',
      contentType: 'font/ttf',
    },
  });

  assert.equal(initUploadResponse.status, 201);
  const uploadId = initUploadResponse.body.uploadId;
  const uploadUrl = initUploadResponse.body.upload.url;

  const putResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'content-type': 'font/ttf',
    },
    body: fontBuffer,
  });

  assert.ok(putResponse.ok, `Expected signed upload PUT to succeed, got ${putResponse.status}`);

  const completeUploadResponse = await requestJson(context, {
    method: 'POST',
    path: '/api/v1/uploads/complete',
    headers: {
      authorization: `Bearer ${contributorAccessToken}`,
    },
    body: {
      uploadId,
      sha256: fontSha,
    },
  });

  assert.equal(completeUploadResponse.status, 201);
  assert.equal(completeUploadResponse.body.submission.status, 'ready_for_submission');
  assert.equal(completeUploadResponse.body.upload.processingStatus, 'completed');

  const submissionDetailResponse = await requestJson(context, {
    method: 'GET',
    path: `/api/v1/submissions/${submissionId}`,
    headers: {
      authorization: `Bearer ${contributorAccessToken}`,
    },
  });

  assert.equal(submissionDetailResponse.status, 200);
  assert.ok(submissionDetailResponse.body.styles.length >= 1);
  assert.equal(submissionDetailResponse.body.permissions.canSubmitForReview, true);
  const styleId = submissionDetailResponse.body.styles[0].id;

  const submitResponse = await requestJson(context, {
    method: 'POST',
    path: `/api/v1/submissions/${submissionId}/submit`,
    headers: {
      authorization: `Bearer ${contributorAccessToken}`,
    },
  });

  assert.equal(submitResponse.status, 201);
  assert.equal(submitResponse.body.status, 'needs_review');

  const reviewDetailResponse = await requestJson(context, {
    method: 'GET',
    path: `/api/v1/admin/reviews/${submissionId}`,
    headers: {
      'x-user-email': 'admin@fonthabesha.local',
    },
  });

  assert.equal(reviewDetailResponse.status, 200);
  assert.ok(reviewDetailResponse.body.uploads.length >= 1);
  assert.ok(reviewDetailResponse.body.styles.length >= 1);

  const approveResponse = await requestJson(context, {
    method: 'POST',
    path: `/api/v1/admin/reviews/${submissionId}/approve`,
    headers: {
      'x-user-email': 'admin@fonthabesha.local',
    },
    body: {
      notes: 'Approved by workflow integration test',
    },
  });

  assert.equal(approveResponse.status, 201);
  assert.equal(approveResponse.body.status, 'approved');

  const familyDownloadResponse = await requestJson(context, {
    method: 'POST',
    path: `/api/v1/downloads/families/${familyId}`,
  });

  assert.equal(familyDownloadResponse.status, 201);
  assert.ok(familyDownloadResponse.body.downloadUrl);

  const styleDownloadResponse = await requestJson(context, {
    method: 'POST',
    path: `/api/v1/downloads/styles/${styleId}`,
  });

  assert.equal(styleDownloadResponse.status, 201);
  assert.ok(styleDownloadResponse.body.downloadUrl);

  const downloadedStyleResponse = await fetch(styleDownloadResponse.body.downloadUrl);
  assert.equal(downloadedStyleResponse.status, 200);
  const downloadedStyleBytes = Buffer.from(await downloadedStyleResponse.arrayBuffer());
  assert.ok(downloadedStyleBytes.length > 0);

  const downloadedFamilyResponse = await fetch(familyDownloadResponse.body.downloadUrl);
  assert.equal(downloadedFamilyResponse.status, 200);
  const downloadedFamilyBytes = Buffer.from(await downloadedFamilyResponse.arrayBuffer());
  assert.ok(downloadedFamilyBytes.length > 0);
  assert.equal(downloadedFamilyBytes.slice(0, 2).toString('binary'), 'PK');

  const familyDetailResponse = await requestJson(context, {
    method: 'GET',
    path: `/api/v1/fonts/${familySlug}`,
  });

  assert.equal(familyDetailResponse.status, 200);
  assert.equal(familyDetailResponse.body.id, familyId);
  assert.ok(familyDetailResponse.body.styles.some((style) => style.id === styleId));
});
