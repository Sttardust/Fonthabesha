# Submission And Review Workflow

## 1. Purpose

This document defines the end-to-end workflow for:

- contributor font submission
- automated backend validation
- reviewer and admin moderation
- publication to public catalog

This is the operational blueprint for the upload-and-approval platform.

Core modeling rule:

- `submission` is a first-class record separate from `font_family`
- one family may have multiple submissions over time
- review actions apply to the submission record
- public visibility applies to the family record after an approved submission is promoted

API rule:

- contributor draft routes are keyed by `submissionId`
- admin review routes are keyed by `submissionId`
- public catalog and download routes are keyed by `familyId` or family `slug`

## 2. Roles

### `contributor`

Can:

- create draft submissions
- edit their own draft metadata
- upload source files to their own drafts
- view processing results for their drafts
- submit drafts for review
- receive change requests and resubmit

Cannot:

- publish directly
- approve or reject submissions
- edit other contributors' drafts unless explicitly elevated

### `reviewer`

Can:

- view review queue
- inspect extracted metadata and processing warnings
- approve, reject, or request changes
- add internal review notes
- archive problematic published families if policy allows

Cannot:

- manage system-level users unless also admin

### `admin`

Can:

- do everything a reviewer can
- manage publishers, designers, licenses, categories, tags, and collections
- override ownership or workflow problems
- resolve escalated moderation cases

## 3. Submission Lifecycle

### States

- `draft`
- `uploaded`
- `processing`
- `processing_failed`
- `ready_for_submission`
- `needs_review`
- `changes_requested`
- `approved`
- `rejected`
- `archived`

### State Meaning

#### `draft`

Submission exists but is incomplete.

Typical reasons:

- metadata not finished
- no source files uploaded yet
- contributor still editing

#### `uploaded`

At least one file has been uploaded, but processing has not started or completed yet.

#### `processing`

Worker is validating or extracting metadata from uploaded binaries.

#### `processing_failed`

Automated processing could not finish successfully.

Typical reasons:

- invalid font binary
- unsupported file type
- corrupted upload
- parser exception

#### `ready_for_submission`

Processing completed successfully and the draft is structurally valid, but has not yet been sent to review.

#### `needs_review`

Contributor submitted the draft. It is now locked for review-oriented workflow.

#### `changes_requested`

Reviewer found fixable issues. The contributor must revise and resubmit.

#### `approved`

Submission is accepted and eligible for public visibility.

#### `rejected`

Submission is denied and will not proceed without a new submission flow or admin intervention.

#### `archived`

Submission or published family is removed from normal active workflows while preserved for history.

## 4. Allowed State Transitions

- `draft -> uploaded`
- `uploaded -> processing`
- `processing -> processing_failed`
- `processing -> ready_for_submission`
- `processing_failed -> draft`
- `ready_for_submission -> needs_review`
- `needs_review -> changes_requested`
- `needs_review -> approved`
- `needs_review -> rejected`
- `changes_requested -> draft`
- `changes_requested -> uploaded`
- `changes_requested -> processing`
- `approved -> archived`
- `rejected -> archived`

Invalid transitions should be rejected explicitly by the backend.

## 5. Contributor Workflow

### Step 1: Create Submission Draft

Contributor creates a draft family and enters:

- legal full name from contributor profile
- contact email from contributor profile
- country
- organization or foundry name if applicable
- English family name
- Amharic family name
- native display name if distinct
- English and Amharic descriptions
- category
- license
- publisher
- designers
- tags
- proof of ownership or source reference
- declared license selection
- contributor declaration acceptance

### Step 2: Upload Font Files

Contributor uploads one or more source files.

V1 preferred upload patterns:

- one file per style for static families
- multiple files for weight/style sets
- one or more variable font files if applicable

### Step 3: Processing Feedback

Contributor sees automated results:

- file accepted or failed
- extracted family and style names
- detected weight and italic properties
- variable axes
- script coverage summary
- duplicate warnings
- validation warnings

### Step 4: Fix Metadata

Contributor adjusts incorrect metadata before review submission.

### Step 5: Submit For Review

Backend checks minimum completeness before allowing review submission.

Minimum submission gate:

- valid license selected
- at least one successfully processed source file
- at least one designer or publisher attribution path
- required English and Amharic metadata present
- ownership or source proof attached
- required contributor profile fields present
- current contributor terms accepted
- contributor declaration signed with typed legal name

## 6. Reviewer Workflow

### Queue Views

The admin/reviewer interface should expose at least these views:

- `Needs review`
- `Processing failed`
- `Changes requested`
- `Approved recently`
- `Rejected`

Recommended queue columns:

- family name
- contributor
- publisher
- license
- script support
- number of files
- processing warnings count
- submitted at
- last updated at

### Review Detail Screen

The review detail screen should show:

- submission summary
- contributor identity
- ownership or source evidence
- extracted font metadata
- file inventory
- processing warnings and errors
- preview/specimen panel
- style list
- review history timeline
- internal notes panel
- action buttons for approve, reject, and request changes

### Review Actions

#### Approve

Use when:

- license is acceptable
- attribution is credible
- metadata quality is sufficient
- font files render correctly
- no blocking duplicate or abuse concerns remain

Backend effects:

- set submission status to `approved`
- promote reviewed submission data into the `font_family` public record
- create review event
- set publication timestamp
- enqueue package generation
- enqueue search indexing
- make family visible to public APIs

#### Request Changes

Use when:

- issues are fixable by the contributor
- metadata is incomplete
- attribution needs clarification
- screenshots/previews are acceptable but packaging needs correction

Backend effects:

- set submission status to `changes_requested`
- create review event with actionable notes
- reopen contributor editing path

#### Reject

Use when:

- license is incompatible
- ownership claim is not credible
- uploaded assets are malicious, fraudulent, or clearly unusable
- the submission violates platform policy

Backend effects:

- set submission status to `rejected`
- create review event with reason
- keep files and audit trail for internal history according to retention policy

## 7. Review Checklist

Every reviewer should evaluate the following categories before approval.

### License Check

- license is in approved allowlist
- redistribution rights are explicit
- license record matches submitted files
- source or ownership proof is present
- declared license selected by contributor matches review understanding

### Attribution Check

- publisher is correct
- designer names are correct
- no misleading branding is present
- source URL or ownership evidence is plausible

### File Integrity Check

- files open successfully
- no parser errors remain unresolved
- family and style grouping is coherent
- no obvious duplicate hashes against existing catalog without explanation

### Font Quality Check

- Ethiopic glyph coverage claim matches actual coverage
- previews render legibly
- naming is not broken
- weights and italics are labeled correctly
- variable axes are sane if variable fonts are used

### Metadata Quality Check

- English and Amharic names are present
- descriptions are useful and not placeholder text
- category and tags are reasonable
- specimen defaults are appropriate

### Catalog Safety Check

- slug is acceptable
- no abusive or copyrighted brand misuse in names or descriptions
- content is suitable for public listing

## 8. Processing Warning Levels

Warnings should be categorized so reviewers can triage quickly.

### `info`

Non-blocking informational messages.

Examples:

- Latin support not detected
- optional preview asset missing

### `warning`

Potentially important but not automatically blocking.

Examples:

- family naming differs across files
- missing Amharic description
- duplicate name similarity to existing family

### `blocking`

Submission cannot proceed to approval until resolved.

Examples:

- invalid license
- parser failure
- zero Ethiopic glyph support for Ethiopic-claimed family
- malicious or unreadable binary

## 9. Ownership And Evidence Rules

Every submission should store at least one of:

- official source URL
- contributor ownership declaration
- upstream repository URL
- license file attachment

V1 recommendation:

- store ownership declaration text in the submission record
- optionally store attached supporting documents in private object storage

## 10. Contributor Declaration Requirements

Every submission should include explicit contributor assent that:

- they own the font or are authorized to distribute it
- the selected license is accurate to the best of their knowledge
- the submitted metadata is accurate to the best of their knowledge
- the platform may remove the font if rights or accuracy are disputed

Recommended stored fields:

- active terms version
- declaration text shown at acceptance time
- acceptance timestamp
- acceptance IP hash
- accepting user ID
- typed legal name used for assent

This declaration supports platform enforcement and auditability, but it does not replace admin review.

## 11. Admin Dashboard Requirements

This is a backend planning document, but the admin dashboard needs clear server-side support.

### Reviewer Dashboard Pages

- review queue page
- review detail page
- processing failures page
- published families audit page

### Contributor Dashboard Pages

- my submissions list
- submission detail page
- upload status page
- change request page

### Required Backend Data For Dashboards

- status counts by queue
- processing warning summaries
- review note timeline
- upload and processing timestamps
- last actor and last action

## 12. Notifications

V1 can keep notifications simple.

Required events:

- processing failed
- ready for submission
- changes requested
- approved
- rejected

Delivery options:

- in-app status first
- email optional in V1

The system should be designed so email can be added later without changing workflow state rules.

## 13. Retention And Cleanup

### Keep

- review events
- approval and rejection notes
- processing summaries
- approved binaries and packages
- contributor assent records
- ownership evidence metadata

### Clean Up Carefully

- stale temporary upload objects
- abandoned unsigned upload sessions
- unused preview intermediates

### Never Delete Automatically In V1

- review audit history
- approved publication records
- contributor assent records tied to a submission

## 14. Abuse And Risk Controls

- rate limit upload initialization
- cap file size per upload
- restrict accepted file extensions and MIME signatures
- require auth for all submission and upload actions
- keep raw uploads private until approved
- require review before any public exposure
- require contributor declaration before review submission
- keep contributor contact data private to authorized staff only

## 15. Acceptance Criteria For The Submission Platform

The submission and review platform is complete when:

- a contributor can create a draft and upload files
- the worker can process valid files and surface useful warnings
- the contributor can submit only when required fields are complete
- the contributor cannot submit without required declaration and license confirmation
- reviewers can approve, reject, or request changes with audit history
- approved fonts become publicly visible and downloadable
- rejected or problematic submissions remain non-public
- all important transitions are traceable through immutable review events
