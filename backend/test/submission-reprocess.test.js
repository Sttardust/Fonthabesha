const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');

const {
  closeTestContext,
  createTestContext,
  forwardedFor,
  requestJson,
  uniqueEmail,
} = require('./helpers/app');
const { buildTestFontBuffer } = require('./helpers/font');

let context;

before(async () => {
  context = await createTestContext();
});

after(async () => {
  await closeTestContext(context);
});

test('staff can reprocess an uploaded submission and make it ready for contributor review', async () => {
  const contributorEmail = uniqueEmail('reprocess');
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
      'x-forwarded-for': forwardedFor('reprocess-register'),
    },
    body: {
      email: contributorEmail,
      password: contributorPassword,
      displayName: 'Reprocess Contributor',
      legalFullName: 'Reprocess Contributor',
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
      familyNameEn: 'Reprocess Sans',
      declaredLicenseId,
      ownershipEvidenceType: 'ownership_statement',
      ownershipEvidenceValue: 'Created for submission reprocess testing.',
      contributorStatementText:
        'I confirm that I have the legal right to submit this font to the platform for review.',
      termsAcceptanceName: 'Reprocess Contributor',
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
      filename: 'reprocess-regular.ttf',
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

  const reprocessResponse = await requestJson(context, {
    method: 'POST',
    path: `/api/v1/admin/reviews/${submissionId}/reprocess`,
    headers: {
      'x-user-email': 'admin@fonthabesha.local',
    },
    body: {
      notes: 'Force processing of the uploaded font before contributor submission.',
    },
  });

  assert.equal(reprocessResponse.status, 201);
  assert.equal(reprocessResponse.body.submission.status, 'ready_for_submission');
  assert.equal(reprocessResponse.body.reprocessedUploadCount, 1);
  assert.equal(reprocessResponse.body.skippedUploadCount, 0);
  assert.equal(reprocessResponse.body.uploads[0].processingStatus, 'completed');

  const contributorDetailResponse = await requestJson(context, {
    method: 'GET',
    path: `/api/v1/submissions/${submissionId}`,
    headers: {
      authorization: `Bearer ${contributorAccessToken}`,
    },
  });

  assert.equal(contributorDetailResponse.status, 200);
  assert.equal(contributorDetailResponse.body.status, 'ready_for_submission');
  assert.equal(contributorDetailResponse.body.analysis.status, 'completed');
  assert.equal(contributorDetailResponse.body.permissions.canSubmitForReview, true);
  assert.equal(contributorDetailResponse.body.review.actionRequired, false);
  assert.equal(contributorDetailResponse.body.review.actionItems.length, 0);
  assert.equal(contributorDetailResponse.body.review.cycle.currentPhase, 'idle');
  assert.equal(contributorDetailResponse.body.review.cycle.latestActionableFeedbackAt, null);
  assert.equal(contributorDetailResponse.body.review.cycle.lastResubmittedAt, null);
  assert.equal(contributorDetailResponse.body.review.cycle.awaitingReviewSince, null);
  assert.equal(contributorDetailResponse.body.review.latestContributorFeedback, null);
  assert.ok(
    contributorDetailResponse.body.review.history.some((event) => event.action === 'reprocessed'),
  );
});
