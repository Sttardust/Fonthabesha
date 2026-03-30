# Admin Dashboard Notes

## 1. Goal

Define the backend-facing requirements for the reviewer and admin dashboard so implementation does not treat moderation as an afterthought.

This is not a visual design document. It is a server-side support checklist for the future frontend.

## 2. Core Screens

### Review Queue

Purpose:

- triage pending submissions quickly

Needs:

- paginated queue data
- filter by status
- filter by license
- filter by contributor
- filter by publisher
- sort by submission time or warning severity

### Review Detail

Purpose:

- inspect one submission deeply and make a decision

Needs:

- family metadata
- style list
- processing warnings
- ownership evidence
- contributor declaration and accepted terms version
- contributor contact summary
- preview assets
- audit history
- internal notes
- action endpoints

### Processing Failures

Purpose:

- identify uploads that never reached review due to processing errors

Needs:

- upload failure reason
- stack-safe error summary
- file metadata
- contributor identity
- retry eligibility

### Published Audit

Purpose:

- review recent approvals and reversals

Needs:

- publication timestamp
- reviewer name
- later archive action if any

## 3. Backend Query Needs

Recommended summary counters:

- number of `needs_review`
- number of `processing_failed`
- number of `changes_requested`
- number of `approved` in the last 7 days
- number of `rejected` in the last 7 days

Recommended list item fields:

- `familyId`
- `slug`
- `nameEn`
- `nameAm`
- `status`
- `contributorName`
- `publisherName`
- `licenseCode`
- `warningCount`
- `blockingIssueCount`
- `submittedAt`
- `updatedAt`

## 4. Reviewer Decision Support

The backend should return enough structured data so the frontend does not need to infer moderation state from raw records.

Recommended computed fields:

- `canApprove`
- `canReject`
- `canRequestChanges`
- `hasBlockingIssues`
- `hasOwnershipEvidence`
- `hasApprovedLicense`
- `hasContributorAssent`
- `ethiopicCoveragePercent`
- `detectedScripts`

## 5. Internal Notes

Reviewer notes should support:

- private internal notes
- decision notes shown to contributor
- system-generated notes from processing

These should be separate types, not one generic text field.

## 6. Retry And Recovery

Processing failures should support controlled recovery:

- admin can retry processing when the failure was transient
- contributor can replace a failed upload
- previous failed attempts remain in history

## 7. Minimal Additional API Endpoints

These are optional but recommended for a good moderation dashboard.

- `GET /admin/reviews/summary`
- `GET /admin/uploads/failures`
- `POST /admin/uploads/:uploadId/retry`
- `POST /admin/reviews/:submissionId/archive`

## 8. Non-Goals

- real-time chat between reviewer and contributor
- threaded comments
- public moderation transparency pages
