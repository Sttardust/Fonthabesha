# Backend Technical Specification

## 1. System Goal

The backend will power a Fontshare-style platform for discovering, reviewing, and downloading Amharic and Ethiopic-script fonts.

Primary qualities:

- reliable binary file handling
- high metadata quality
- strong search and filtering
- clear admin moderation
- safe and traceable publishing workflow

## 2. Functional Requirements

### Public Features

- list font families
- fetch family detail by slug
- filter by category, script, license, publisher, designer, tags, variable support, and date
- search by English name, Amharic name, tags, and description
- fetch family styles and downloadable assets
- fetch collections
- fetch related families
- increment views and downloads

### Contributor Features

- sign in
- maintain contributor profile and contact information
- upload font files
- create or update family metadata
- manage draft submissions
- provide license declaration and ownership evidence
- accept contributor terms and declaration
- submit for review

### Admin And Reviewer Features

- review submission queue
- inspect extracted metadata
- approve, reject, archive, or request changes
- manage publishers, designers, licenses, categories, tags, and collections
- inspect contributor declaration and ownership evidence
- view audit logs and analytics

### Background Features

- process uploads asynchronously
- generate family zip packages
- create search documents
- generate previews and specimen data
- sync analytics rollups
- retain submission assent and compliance audit records

## 3. Non-Functional Requirements

- API p95 under 300ms for normal catalog reads
- upload processing resilient to worker restarts
- idempotent job handling
- immutable audit log for review decisions
- immutable record of contributor assent per submission
- object storage-backed downloads
- horizontal scaling for API and worker processes

## 4. Domain Model

### Main Entities

#### `users`

- `id`
- `email`
- `password_hash`
- `display_name`
- `legal_full_name`
- `country_code`
- `organization_name`
- `phone_number`
- `role` (`admin`, `reviewer`, `contributor`)
- `status`
- `created_at`
- `updated_at`

#### `publishers`

- `id`
- `name`
- `slug`
- `bio_en`
- `bio_am`
- `website_url`
- `country_code`
- `is_active`
- `created_at`
- `updated_at`

#### `designers`

- `id`
- `name`
- `slug`
- `bio_en`
- `bio_am`
- `website_url`
- `social_links`
- `created_at`
- `updated_at`

#### `font_families`

- `id`
- `slug`
- `name_en`
- `name_am`
- `native_name`
- `description_en`
- `description_am`
- `script`
- `primary_language`
- `category_id`
- `license_id`
- `publisher_id`
- `status`
- `is_variable_family`
- `supports_ethiopic`
- `supports_latin`
- `version_label`
- `cover_image_key`
- `specimen_text_default_am`
- `specimen_text_default_en`
- `inserted_at`
- `published_at`
- `updated_at`

#### `submissions`

- `id`
- `family_id`
- `owner_user_id`
- `status`
- `declared_license_id`
- `ownership_evidence_type`
- `ownership_evidence_value`
- `contributor_statement_text`
- `terms_version`
- `terms_accepted_at`
- `terms_accepted_ip_hash`
- `terms_acceptance_name`
- `submitted_at`
- `reviewed_at`
- `reviewed_by_user_id`
- `last_action_at`
- `created_at`
- `updated_at`

#### `font_styles`

- `id`
- `family_id`
- `name`
- `slug`
- `weight_class`
- `weight_label`
- `is_italic`
- `is_variable`
- `is_default`
- `file_key`
- `format`
- `version_label`
- `file_size_bytes`
- `sha256`
- `metrics_json`
- `axes_json`
- `features_json`
- `glyph_coverage_json`
- `status`
- `published_at`
- `created_at`
- `updated_at`

#### `font_family_designers`

- `family_id`
- `designer_id`
- `sort_order`

#### `licenses`

- `id`
- `code`
- `name`
- `summary_en`
- `summary_am`
- `full_text_url`
- `allows_redistribution`
- `allows_commercial_use`
- `requires_attribution`
- `is_active`

#### `contributor_terms_versions`

- `id`
- `version`
- `title`
- `document_url`
- `checksum`
- `effective_at`
- `is_active`

#### `categories`

- `id`
- `name`
- `slug`

#### `tags`

- `id`
- `name_en`
- `name_am`
- `slug`

#### `font_family_tags`

- `family_id`
- `tag_id`

#### `collections`

- `id`
- `slug`
- `title_en`
- `title_am`
- `description_en`
- `description_am`
- `is_featured`
- `status`
- `created_by`
- `published_at`

#### `collection_items`

- `collection_id`
- `family_id`
- `sort_order`

#### `uploads`

- `id`
- `uploader_id`
- `submission_id`
- `family_id`
- `original_filename`
- `storage_key`
- `mime_type`
- `file_size_bytes`
- `sha256`
- `processing_status`
- `processing_error`
- `uploaded_at`
- `processed_at`

#### `review_events`

- `id`
- `submission_id`
- `family_id`
- `actor_user_id`
- `action`
- `notes`
- `metadata_json`
- `created_at`

#### `download_events`

- `id`
- `family_id`
- `style_id`
- `user_id`
- `ip_hash`
- `user_agent_hash`
- `country_code`
- `created_at`

#### `view_events`

- `id`
- `family_id`
- `user_id`
- `ip_hash`
- `created_at`

## 5. Relationship Notes

- one publisher has many families
- one family has many styles
- one family can have one or more submissions over time
- one submission belongs to one family
- one submission has many uploads and review events
- one family has many designers through a join table
- one family has many tags through a join table
- one collection has many families

## 6. Storage Design

### Buckets Or Prefixes

- `raw-uploads/`
- `approved-fonts/`
- `packages/`
- `previews/`
- `covers/`
- `temp/`

### File Classes

- raw uploaded source files
- approved style binaries
- generated family zip packages
- generated preview assets
- optional subsetted webfont files

### Immutable File Principle

Approved binary files should be immutable. If a font changes, publish a new version rather than mutating the old object in place.

## 7. Processing Pipeline

### Upload Flow

1. contributor requests upload session
2. backend returns signed upload target
3. file lands in `raw-uploads/`
4. contributor finalizes upload
5. backend enqueues processing job
6. worker validates and extracts metadata
7. system links style files to family draft
8. reviewer approves or rejects
9. approval moves assets to approved location and updates search index

### Contributor Compliance Flow

1. contributor completes required profile and contact fields
2. contributor selects a declared license
3. contributor provides ownership evidence or source reference
4. contributor reviews active contributor terms and declaration text
5. contributor explicitly accepts the current terms version
6. backend stores assent metadata before review submission is allowed

### Worker Responsibilities

- file checksum verification
- MIME and extension validation
- font parser validation
- metadata extraction from font tables
- variable axis detection
- OpenType feature extraction
- glyph coverage detection for Ethiopic ranges
- duplicate detection using hashes and naming heuristics
- family package generation
- preview/specimen generation

## 8. Search Specification

### Search Engine

Use `Meilisearch` for:

- family name search
- tag and category filters
- designer and publisher filters
- license and script filters
- popularity and recency sorting

### Search Document Shape

- `family_id`
- `slug`
- `name_en`
- `name_am`
- `native_name`
- `publisher_name`
- `designer_names`
- `category`
- `license_code`
- `script`
- `tags_en`
- `tags_am`
- `description_en`
- `description_am`
- `supports_ethiopic`
- `supports_latin`
- `is_variable_family`
- `download_count_30d`
- `view_count_30d`
- `published_at`

### Amharic Search Rules

- normalize Ethiopic punctuation variants where necessary
- support English transliteration aliases when curated
- index both English and Amharic metadata fields
- avoid relying purely on stemming

## 9. API Outline

All routes shown below are versioned under `/api/v1`.

### Public Routes

#### Catalog

- `GET /fonts`
- `GET /fonts/:slug`
- `GET /fonts/:slug/styles`
- `GET /fonts/:slug/related`
- `GET /fonts/filters`
- `GET /search/fonts`

Example query parameters for `GET /fonts`:

- `q`
- `category`
- `script`
- `license`
- `publisher`
- `designer`
- `tag`
- `variable=true|false`
- `sort=popular|newest|alphabetical`
- `page`
- `pageSize`

#### Collections

- `GET /collections`
- `GET /collections/:slug`

#### Downloads

- `POST /downloads/families/:familyId`
- `POST /downloads/styles/:styleId`

The POST pattern is preferred so analytics, rate limiting, and signed URL issuance happen server-side.

### Auth Routes

- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`

### Contributor Routes

- `POST /uploads/init`
- `POST /uploads/complete`
- `GET /submissions`
- `POST /submissions`
- `PATCH /submissions/:id`
- `POST /submissions/:id/submit`

### Admin Routes

- `GET /admin/reviews`
- `GET /admin/reviews/:submissionId`
- `POST /admin/reviews/:submissionId/approve`
- `POST /admin/reviews/:submissionId/reject`
- `POST /admin/reviews/:submissionId/request-changes`
- `CRUD /admin/publishers`
- `CRUD /admin/designers`
- `CRUD /admin/licenses`
- `CRUD /admin/categories`
- `CRUD /admin/tags`
- `CRUD /admin/collections`

### Analytics Routes

- `GET /admin/analytics/overview`
- `GET /admin/analytics/downloads`
- `GET /admin/analytics/views`
- `GET /admin/analytics/searches`

## 10. Response Design Principles

- use cursor or page-based pagination consistently
- return stable IDs and slugs
- separate public DTOs from internal ORM models
- include derived metadata that the frontend needs directly

Example derived fields:

- `numberOfStyles`
- `hasVariableStyles`
- `defaultStyle`
- `downloadCount`
- `supportedScripts`

## 11. Security Model

### Access Control

- public users can browse and download
- contributors can manage only their own drafts unless elevated
- reviewers and admins can inspect queued submissions
- only admins can manage global vocabularies and publish removals

### Contributor Data Collection

Required in V1:

- legal full name
- email
- country
- contributor declaration acceptance
- accepted terms version

Optional in V1:

- organization or foundry name
- phone number

Do not collect unnecessary sensitive personal data.

### Hardening

- JWT rotation with refresh token revocation
- upload size limits
- rate limits on auth, search, and downloads
- signed object-storage URLs
- hashed IPs for analytics privacy
- hashed IPs for contributor assent records
- content-type and extension verification
- font parser sandboxing in workers

## 12. Observability

### Logging

Structured logs with request ID, user ID, job ID, and family ID where available.

### Metrics

- request count and latency
- job success/failure rates
- upload processing duration
- search latency
- download issuance count
- storage error rate

### Alerts

- failed processing jobs above threshold
- elevated 5xx rate
- search cluster unavailable
- storage write failures

## 13. Testing Strategy

### Unit Tests

- DTO validation
- permission rules
- metadata normalization
- search query translation

### Integration Tests

- auth flows
- catalog queries
- upload completion
- review transitions
- download issuance

### End-To-End Tests

- upload to approval to public visibility
- search index sync after approval
- family package download flow

### Fixture Strategy

Maintain a small curated font fixture set:

- static Ethiopic font
- variable Ethiopic font
- mixed-script font
- malformed font file
- duplicate file hash case

## 14. Suggested Initial Folder Structure

```text
src/
  app.module.ts
  common/
  config/
  auth/
  users/
  publishers/
  designers/
  font-families/
  font-styles/
  uploads/
  processing/
  downloads/
  collections/
  search/
  analytics/
  admin-review/
  licenses/
  health/
prisma/
workers/
docs/
```

## 15. Environment Variables

- `DATABASE_URL`
- `REDIS_URL`
- `S3_ENDPOINT`
- `S3_REGION`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_BUCKET_RAW`
- `S3_BUCKET_PUBLIC`
- `MEILISEARCH_URL`
- `MEILISEARCH_API_KEY`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `APP_BASE_URL`
- `CDN_BASE_URL`

## 16. Definition Of Ready Before Coding

Before implementation starts, these must be fixed:

- final MVP feature list
- supported license policy
- user role definitions
- language and script support policy
- search behavior expectations for Amharic and English
- contributor declaration text and terms versioning policy

## 17. Definition Of Done For Backend V1

Backend V1 is complete when:

- admins can create controlled vocabularies and collections
- contributors can upload and submit fonts
- workers can process valid font files and reject invalid ones
- reviewers can approve and publish a family
- public APIs can list, search, and fetch family details
- downloads are served through secure backend-issued URLs
- analytics are recorded for views and downloads
- documentation, tests, and deployment setup exist

## 18. Locked V1 Assumptions

These assumptions are now fixed for backend planning.

- only legally redistributable fonts are accepted in V1
- public browsing and downloads do not require end-user accounts
- only `admin`, `reviewer`, and `contributor` roles exist in V1
- only editorial collections are supported in V1
- primary launch support is `Amharic` on `Ethiopic` script, with schema extensibility for more Ethiopic-script languages later
- previews use both server-side generated assets and client-side interactive rendering
- accepted upload formats are `TTF`, `OTF`, `WOFF`, and `WOFF2`
- every submission requires review before publication
- `submissions` are first-class records separate from `font_families`
- contributor identity, license declaration, and assent records are required for V1 submissions
