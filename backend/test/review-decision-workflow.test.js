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
  const analyticsFrom = new Date().toISOString();
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

  const contributorDetailAfterProcessing = await requestJson(context, {
    method: 'GET',
    path: `/api/v1/submissions/${submissionId}`,
    headers: {
      authorization: `Bearer ${contributorAccessToken}`,
    },
  });
  assert.equal(contributorDetailAfterProcessing.status, 200);
  const styleId = contributorDetailAfterProcessing.body.styles[0].id;

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
      issues: [
        {
          targetUploadId: initUploadResponse.body.uploadId,
          targetStyleId: styleId,
          issueCode: 'spacing_consistency',
          note: 'Check the glyph spacing in the uploaded regular style.',
        },
        {
          targetStyleId: styleId,
          issueCode: 'family_description_missing_context',
          note: 'Expand the family description for contributors and reviewers.',
        },
      ],
    },
  });
  assert.equal(requestChangesResponse.status, 201);
  assert.equal(requestChangesResponse.body.status, 'changes_requested');
  assert.equal(requestChangesResponse.body.reviewDecision.metadata.targetUploadId, initUploadResponse.body.uploadId);
  assert.equal(requestChangesResponse.body.reviewDecision.metadata.targetStyleId, styleId);
  assert.equal(requestChangesResponse.body.reviewDecision.metadata.issueCode, 'spacing_consistency');
  assert.equal(requestChangesResponse.body.reviewDecision.metadata.issues.length, 2);

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
  assert.equal(contributorDetailAfterChanges.body.review.actionRequired, true);
  assert.equal(contributorDetailAfterChanges.body.review.actionItems.length, 2);
  assert.equal(contributorDetailAfterChanges.body.review.issueResolutions.length, 2);
  assert.equal(contributorDetailAfterChanges.body.review.cycle.currentPhase, 'awaiting_contributor');
  assert.ok(contributorDetailAfterChanges.body.review.cycle.latestActionableFeedbackAt);
  assert.equal(contributorDetailAfterChanges.body.review.cycle.lastResubmittedAt, null);
  assert.equal(contributorDetailAfterChanges.body.review.cycle.awaitingReviewSince, null);
  assert.equal(
    contributorDetailAfterChanges.body.review.issueResolutions[0].resolutionStatus,
    'open',
  );
  assert.equal(
    contributorDetailAfterChanges.body.review.actionItems[0].issueCode,
    'spacing_consistency',
  );
  assert.equal(
    contributorDetailAfterChanges.body.review.actionItems[0].upload.id,
    initUploadResponse.body.uploadId,
  );
  assert.equal(contributorDetailAfterChanges.body.review.actionItems[0].style.id, styleId);
  assert.match(
    contributorDetailAfterChanges.body.review.actionItems[0].summary,
    /spacing consistency/i,
  );
  assert.equal(
    contributorDetailAfterChanges.body.review.latestContributorFeedback.action,
    'request_changes',
  );
  assert.match(
    contributorDetailAfterChanges.body.review.latestContributorFeedback.notes,
    /clarify the family description/i,
  );
  assert.equal(
    contributorDetailAfterChanges.body.review.latestContributorFeedback.metadata.targetUploadId,
    initUploadResponse.body.uploadId,
  );
  assert.equal(
    contributorDetailAfterChanges.body.review.latestContributorFeedback.metadata.targetStyleId,
    styleId,
  );
  assert.equal(
    contributorDetailAfterChanges.body.review.latestContributorFeedback.metadata.issueCode,
    'spacing_consistency',
  );
  assert.equal(contributorDetailAfterChanges.body.review.latestContributorFeedback.kind, 'feedback');
  assert.equal(contributorDetailAfterChanges.body.review.latestContributorFeedback.issues.length, 2);
  assert.equal(
    contributorDetailAfterChanges.body.review.latestContributorFeedback.issues[0].issueCode,
    'spacing_consistency',
  );
  assert.equal(
    contributorDetailAfterChanges.body.review.latestContributorFeedback.issues[1].issueCode,
    'family_description_missing_context',
  );
  assert.equal(
    contributorDetailAfterChanges.body.review.latestContributorFeedback.targets[0].uploadId,
    initUploadResponse.body.uploadId,
  );
  assert.equal(
    contributorDetailAfterChanges.body.review.latestContributorFeedback.targets[0].styleId,
    styleId,
  );
  assert.equal(
    contributorDetailAfterChanges.body.review.latestContributorFeedback.targets[1].styleId,
    styleId,
  );
  assert.ok(
    contributorDetailAfterChanges.body.review.history.some((event) => event.action === 'request_changes'),
  );

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

  const contributorDetailAfterResubmit = await requestJson(context, {
    method: 'GET',
    path: `/api/v1/submissions/${submissionId}`,
    headers: {
      authorization: `Bearer ${contributorAccessToken}`,
    },
  });
  assert.equal(contributorDetailAfterResubmit.status, 200);
  assert.equal(contributorDetailAfterResubmit.body.status, 'needs_review');
  assert.equal(contributorDetailAfterResubmit.body.review.actionRequired, false);
  assert.equal(contributorDetailAfterResubmit.body.review.actionItems.length, 0);
  assert.equal(contributorDetailAfterResubmit.body.review.issueResolutions.length, 2);
  assert.equal(contributorDetailAfterResubmit.body.review.cycle.currentPhase, 'awaiting_staff');
  assert.ok(contributorDetailAfterResubmit.body.review.cycle.lastResubmittedAt);
  assert.ok(contributorDetailAfterResubmit.body.review.cycle.awaitingReviewSince);
  assert.equal(
    contributorDetailAfterResubmit.body.review.issueResolutions[0].resolutionStatus,
    'resubmitted',
  );
  assert.ok(contributorDetailAfterResubmit.body.review.issueResolutions[0].resubmittedAt);
  assert.equal(
    contributorDetailAfterResubmit.body.review.issueResolutions[0].upload.id,
    initUploadResponse.body.uploadId,
  );
  assert.equal(contributorDetailAfterResubmit.body.review.issueResolutions[0].style.id, styleId);

  const rejectResponse = await requestJson(context, {
    method: 'POST',
    path: `/api/v1/admin/reviews/${submissionId}/reject`,
    headers: {
      'x-user-email': 'admin@fonthabesha.local',
    },
    body: {
      notes: 'Rejected by automated workflow test after re-review.',
      targetStyleId: styleId,
      issueCode: 'license_review_failed',
    },
  });
  assert.equal(rejectResponse.status, 201);
  assert.equal(rejectResponse.body.status, 'rejected');
  assert.equal(rejectResponse.body.reviewDecision.metadata.targetStyleId, styleId);
  assert.equal(rejectResponse.body.reviewDecision.metadata.issueCode, 'license_review_failed');

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
  assert.equal(contributorDetailAfterReject.body.review.actionRequired, false);
  assert.equal(contributorDetailAfterReject.body.review.actionItems.length, 0);
  assert.equal(contributorDetailAfterReject.body.review.issueResolutions.length, 0);
  assert.equal(contributorDetailAfterReject.body.review.cycle.currentPhase, 'closed');
  assert.equal(contributorDetailAfterReject.body.review.cycle.awaitingReviewSince, null);
  assert.equal(contributorDetailAfterReject.body.review.latestContributorFeedback.action, 'rejected');
  assert.match(
    contributorDetailAfterReject.body.review.latestContributorFeedback.notes,
    /Rejected by automated workflow test/i,
  );
  assert.equal(
    contributorDetailAfterReject.body.review.latestContributorFeedback.metadata.targetStyleId,
    styleId,
  );
  assert.equal(
    contributorDetailAfterReject.body.review.latestContributorFeedback.metadata.issueCode,
    'license_review_failed',
  );
  assert.ok(contributorDetailAfterReject.body.review.history.length >= 3);

  const reviewDetailAfterReject = await requestJson(context, {
    method: 'GET',
    path: `/api/v1/admin/reviews/${submissionId}`,
    headers: {
      'x-user-email': 'admin@fonthabesha.local',
    },
  });
  assert.equal(reviewDetailAfterReject.status, 200);
  assert.equal(reviewDetailAfterReject.body.family.status, 'rejected');
  const requestChangesEvent = reviewDetailAfterReject.body.reviewHistory.find(
    (event) => event.action === 'request_changes',
  );
  assert.ok(requestChangesEvent);
  assert.equal(requestChangesEvent.kind, 'feedback');
  assert.equal(requestChangesEvent.metadata.targetUploadId, initUploadResponse.body.uploadId);
  assert.equal(requestChangesEvent.metadata.targetStyleId, styleId);
  assert.equal(requestChangesEvent.metadata.issueCode, 'spacing_consistency');
  assert.equal(requestChangesEvent.metadata.issues.length, 2);
  assert.equal(requestChangesEvent.issues[0].issueCode, 'spacing_consistency');
  assert.equal(requestChangesEvent.issues[1].issueCode, 'family_description_missing_context');
  assert.equal(requestChangesEvent.targets[0].uploadId, initUploadResponse.body.uploadId);
  assert.equal(requestChangesEvent.targets[0].styleId, styleId);
  assert.equal(requestChangesEvent.targets[1].styleId, styleId);
  assert.match(requestChangesEvent.summary, /spacing_consistency/i);
  const rejectedEvent = reviewDetailAfterReject.body.reviewHistory.find(
    (event) => event.action === 'rejected',
  );
  assert.ok(rejectedEvent);
  assert.equal(rejectedEvent.kind, 'decision');
  assert.equal(rejectedEvent.metadata.targetStyleId, styleId);
  assert.equal(rejectedEvent.metadata.issueCode, 'license_review_failed');
  assert.equal(rejectedEvent.targets[0].styleId, styleId);

  const filteredHistoryResponse = await requestJson(context, {
    method: 'GET',
    path: `/api/v1/admin/reviews/${submissionId}/history`,
    headers: {
      'x-user-email': 'admin@fonthabesha.local',
    },
    query: {
      kind: 'feedback',
      issueCode: 'spacing_consistency',
    },
  });
  assert.equal(filteredHistoryResponse.status, 200);
  assert.equal(filteredHistoryResponse.body.summary.total, 1);
  assert.equal(filteredHistoryResponse.body.summary.byKind.feedback, 1);
  assert.equal(filteredHistoryResponse.body.items.length, 1);
  assert.equal(filteredHistoryResponse.body.items[0].action, 'request_changes');
  assert.equal(filteredHistoryResponse.body.items[0].issues.length, 2);
  assert.equal(filteredHistoryResponse.body.items[0].issueCode, 'spacing_consistency');

  const analyticsResponse = await requestJson(context, {
    method: 'GET',
    path: '/api/v1/admin/reviews/analytics',
    headers: {
      'x-user-email': 'admin@fonthabesha.local',
    },
    query: {
      from: analyticsFrom,
      timezone: 'Africa/Addis_Ababa',
    },
  });
  assert.equal(analyticsResponse.status, 200);
  assert.ok(analyticsResponse.body.queue.needsReview >= 0);
  assert.ok(analyticsResponse.body.queue.changesRequested >= 0);
  assert.equal(analyticsResponse.body.totals.submitted, 2);
  assert.equal(analyticsResponse.body.totals.requestChanges, 1);
  assert.equal(analyticsResponse.body.totals.rejected, 1);
  assert.equal(analyticsResponse.body.turnaround.reviewedSubmissionCount, 1);
  assert.ok(analyticsResponse.body.dailyActivity.length >= 1);
  assert.ok(
    analyticsResponse.body.topIssueCodes.some(
      (entry) => entry.issueCode === 'spacing_consistency' && entry.count === 1,
    ),
  );

  const rejectedResubmitResponse = await requestJson(context, {
    method: 'POST',
    path: `/api/v1/submissions/${submissionId}/submit`,
    headers: {
      authorization: `Bearer ${contributorAccessToken}`,
    },
  });
  assert.equal(rejectedResubmitResponse.status, 400);
});
