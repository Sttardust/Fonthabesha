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

test('review changes and rejection workflow keeps contributor resubmission path correct', async () => {
  const contributorEmail = uniqueEmail('review-flow');
  const contributorPassword = 'ContributorPass123!';
  const fontBuffer = buildTestFontBuffer();
  const fontSha = sha256Hex(fontBuffer);

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
      'x-forwarded-for': forwardedFor('review-flow-register'),
    },
    body: {
      email: contributorEmail,
      password: contributorPassword,
      displayName: 'Review Flow Contributor',
      legalFullName: 'Review Flow Contributor',
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
      familyNameEn: 'Review Decision Sans',
      declaredLicenseId,
      ownershipEvidenceType: 'ownership_statement',
      ownershipEvidenceValue: 'Created for review workflow automated testing.',
      contributorStatementText:
        'I confirm that I have the legal right to submit this font to the platform for review.',
      termsAcceptanceName: 'Review Flow Contributor',
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
      filename: 'review-decision-regular.ttf',
      contentType: 'font/ttf',
    },
  });
  assert.equal(initUploadResponse.status, 201);

  const uploadPutResponse = await fetch(initUploadResponse.body.upload.url, {
    method: 'PUT',
    headers: {
      'content-type': 'font/ttf',
    },
    body: fontBuffer,
  });
  assert.equal(uploadPutResponse.status, 200);

  const completeUploadResponse = await requestJson(context, {
    method: 'POST',
    path: '/api/v1/uploads/complete',
    headers: {
      authorization: `Bearer ${contributorAccessToken}`,
    },
    body: {
      uploadId: initUploadResponse.body.uploadId,
      sha256: fontSha,
    },
  });
  assert.equal(completeUploadResponse.status, 201);

  const firstSubmitResponse = await requestJson(context, {
    method: 'POST',
    path: `/api/v1/submissions/${submissionId}/submit`,
    headers: {
      authorization: `Bearer ${contributorAccessToken}`,
    },
  });
  assert.equal(firstSubmitResponse.status, 201);
  assert.equal(firstSubmitResponse.body.status, 'needs_review');

  const requestChangesResponse = await requestJson(context, {
    method: 'POST',
    path: `/api/v1/admin/reviews/${submissionId}/request-changes`,
    headers: {
      'x-user-email': 'admin@fonthabesha.local',
    },
    body: {
      notes: 'Please clarify the family description and confirm spacing consistency.',
    },
  });
  assert.equal(requestChangesResponse.status, 201);
  assert.equal(requestChangesResponse.body.status, 'changes_requested');

  const contributorDetailAfterChanges = await requestJson(context, {
    method: 'GET',
    path: `/api/v1/submissions/${submissionId}`,
    headers: {
      authorization: `Bearer ${contributorAccessToken}`,
    },
  });
  assert.equal(contributorDetailAfterChanges.status, 200);
  assert.equal(contributorDetailAfterChanges.body.status, 'changes_requested');
  assert.equal(contributorDetailAfterChanges.body.permissions.canEditMetadata, true);
  assert.equal(contributorDetailAfterChanges.body.permissions.canEditStyles, true);
  assert.equal(contributorDetailAfterChanges.body.permissions.canSubmitForReview, true);

  const metadataUpdateResponse = await requestJson(context, {
    method: 'PATCH',
    path: `/api/v1/submissions/${submissionId}/metadata`,
    headers: {
      authorization: `Bearer ${contributorAccessToken}`,
    },
    body: {
      descriptionEn: 'Updated after review feedback for the automated workflow test.',
      supportsLatin: true,
    },
  });
  assert.equal(metadataUpdateResponse.status, 200);

  const secondSubmitResponse = await requestJson(context, {
    method: 'POST',
    path: `/api/v1/submissions/${submissionId}/submit`,
    headers: {
      authorization: `Bearer ${contributorAccessToken}`,
    },
  });
  assert.equal(secondSubmitResponse.status, 201);
  assert.equal(secondSubmitResponse.body.status, 'needs_review');

  const rejectResponse = await requestJson(context, {
    method: 'POST',
    path: `/api/v1/admin/reviews/${submissionId}/reject`,
    headers: {
      'x-user-email': 'admin@fonthabesha.local',
    },
    body: {
      notes: 'Rejected by automated workflow test after re-review.',
    },
  });
  assert.equal(rejectResponse.status, 201);
  assert.equal(rejectResponse.body.status, 'rejected');

  const contributorDetailAfterReject = await requestJson(context, {
    method: 'GET',
    path: `/api/v1/submissions/${submissionId}`,
    headers: {
      authorization: `Bearer ${contributorAccessToken}`,
    },
  });
  assert.equal(contributorDetailAfterReject.status, 200);
  assert.equal(contributorDetailAfterReject.body.status, 'rejected');
  assert.equal(contributorDetailAfterReject.body.permissions.canEditMetadata, false);
  assert.equal(contributorDetailAfterReject.body.permissions.canEditStyles, false);
  assert.equal(contributorDetailAfterReject.body.permissions.canSubmitForReview, false);

  const reviewDetailAfterReject = await requestJson(context, {
    method: 'GET',
    path: `/api/v1/admin/reviews/${submissionId}`,
    headers: {
      'x-user-email': 'admin@fonthabesha.local',
    },
  });
  assert.equal(reviewDetailAfterReject.status, 200);
  assert.equal(reviewDetailAfterReject.body.family.status, 'rejected');
  assert.ok(
    reviewDetailAfterReject.body.reviewHistory.some((event) => event.action === 'request_changes'),
  );
  assert.ok(reviewDetailAfterReject.body.reviewHistory.some((event) => event.action === 'rejected'));

  const rejectedResubmitResponse = await requestJson(context, {
    method: 'POST',
    path: `/api/v1/submissions/${submissionId}/submit`,
    headers: {
      authorization: `Bearer ${contributorAccessToken}`,
    },
  });
  assert.equal(rejectedResubmitResponse.status, 400);
});
