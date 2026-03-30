# Backend Implementation Blueprint

## 1. Purpose

This document converts the backend plan into an execution-ready blueprint for engineering work.

It defines:

- module boundaries
- ownership of responsibilities
- request and job flows
- database implementation rules
- search and analytics integration points
- milestone acceptance criteria

This is still planning documentation, not code.

## 2. Application Shape

The backend should start as a modular monolith with three runnable processes:

- `api`: serves HTTP APIs and admin endpoints
- `worker`: executes background jobs for uploads, processing, indexing, and analytics
- `scheduler`: triggers recurring aggregation and cleanup jobs

## 3. Module Breakdown

### `common`

Shared cross-cutting primitives:

- error model
- base DTOs
- pagination helpers
- guards and decorators
- request ID and tracing helpers
- config helpers

### `auth`

Responsibilities:

- login
- token refresh
- logout
- current-session lookup
- password hashing
- refresh token rotation and revocation

Owns:

- access token issuance
- refresh token storage policy
- auth guards

### `users`

Responsibilities:

- internal user CRUD
- role assignment
- account activation and suspension
- contributor profile completeness checks

### `publishers`

Responsibilities:

- publisher CRUD
- publisher lookup for family attribution
- slug generation and uniqueness

### `designers`

Responsibilities:

- designer CRUD
- designer-family associations

### `licenses`

Responsibilities:

- approved license vocabulary
- license rules used during review

### `legal-compliance`

Responsibilities:

- contributor terms version management
- declaration text exposure
- contributor assent recording
- ownership evidence policy support

### `taxonomy`

Responsibilities:

- categories
- tags
- supported scripts
- supported languages

This module is useful even if categories and tags are stored in separate tables.

### `font-families`

Responsibilities:

- family CRUD
- public list and detail queries
- related-family derivation
- family publish state transitions

This module owns the canonical public family record.

### `font-styles`

Responsibilities:

- style records
- default-style selection
- style-level download metadata
- style file references

### `uploads`

Responsibilities:

- upload initialization
- signed upload configuration
- upload completion
- duplicate pre-check hooks

This module does not parse fonts. It hands off to processing.

Uploads attach to a `submission`, not directly to public publication state.

### `processing`

Responsibilities:

- validation of uploaded binaries
- metadata extraction
- glyph coverage detection
- preview generation
- package generation
- duplicate detection

This module runs mostly inside workers.

### `admin-review`

Responsibilities:

- review queue listing
- review decision endpoints
- audit event creation
- moderation notes

This module operates primarily on `submissions`, and only secondarily updates `font_families` when publication state changes.

### `search`

Responsibilities:

- search index document building
- search query translation
- index sync on publish/update/archive

### `downloads`

Responsibilities:

- file access authorization
- signed URL issuance
- download event creation
- family package orchestration

### `collections`

Responsibilities:

- editorial collection CRUD
- collection item ordering
- public collection reads

### `analytics`

Responsibilities:

- view event ingest
- download event ingest
- search event ingest
- daily rollups
- admin reporting queries

### `health`

Responsibilities:

- readiness and liveness checks
- dependency checks for Postgres, Redis, storage, and search

## 4. Primary Flows

### Public Catalog Flow

1. client requests `/api/v1/fonts`
2. API validates query parameters
3. API resolves search filters and sort rules
4. API fetches from Meilisearch or Postgres depending on query mode
5. API hydrates summary DTOs from Postgres as needed
6. API returns paginated result with stable metadata

### Font Detail Flow

1. client requests `/api/v1/fonts/:slug`
2. API loads published family and published styles
3. API loads designers, publisher, tags, and related metadata
4. API emits asynchronous view event
5. API returns detail DTO

### Upload To Publish Flow

1. contributor creates or updates a family draft
2. contributor completes required identity and contact fields if missing
3. contributor selects declared license and provides ownership evidence
4. contributor accepts active contributor terms and declaration
5. contributor requests upload initialization
6. client uploads source file directly to object storage
7. contributor calls upload completion endpoint
8. API creates `uploads` record and processing job
9. worker validates binary and extracts metadata
10. worker updates family and styles draft state
11. contributor submits family for review
12. reviewer approves or rejects
13. approval triggers package generation, index sync, and publication timestamps

Important modeling rule:

- `submission` is the moderation object
- `font_family` is the public catalog object
- approval promotes the latest reviewed submission state into the published family record

### Download Flow

1. client posts to family or style download endpoint
2. API verifies family or style is published
3. API records download intent
4. API returns signed URL or proxied file response metadata
5. download event is finalized asynchronously if needed

## 5. Database Design Rules

### General Rules

- use UUID primary keys
- use snake_case table and column names
- keep mutable workflow state in Postgres
- do not store large blobs in Postgres
- use `jsonb` for extracted metrics and feature payloads only when the shape is semi-structured

### Audit Rules

- review decisions must always create immutable `review_events`
- important status changes should record actor, timestamp, and before/after status
- contributor assent must record terms version, acceptance timestamp, typed acceptance name, and acceptance IP hash

### Uniqueness Rules

- `users.email` unique
- `publishers.slug` unique
- `designers.slug` unique
- `font_families.slug` unique
- `licenses.code` unique
- `categories.slug` unique
- `tags.slug` unique
- `submissions(family_id, created_at)` indexed
- `uploads.sha256` indexed
- `font_styles.sha256` indexed

### Recommended Indexes

- `font_families(status, published_at desc)`
- `font_families(publisher_id, status)`
- `font_styles(family_id, is_default desc)`
- `uploads(family_id, processing_status)`
- `uploads(submission_id, processing_status)`
- `submissions(owner_user_id, status, updated_at desc)`
- `review_events(family_id, created_at desc)`
- `review_events(submission_id, created_at desc)`
- `download_events(family_id, created_at desc)`
- `view_events(family_id, created_at desc)`
- `collections(status, published_at desc)`

## 6. Search Strategy

### Read Path

Use Meilisearch as the first-stage search engine for:

- keyword search
- filtered browsing
- popularity and recency sorting

Use Postgres as the source of truth for:

- exact entity hydration
- access control checks
- draft vs published state

### Index Update Triggers

Reindex on:

- family creation
- family metadata update
- style metadata update affecting derived family fields
- approval
- archive
- collection feature flag changes if surfaced in ranking

### Fallback Behavior

If search is unavailable:

- public search endpoint should fail clearly with a retryable service error
- basic catalog listing can still be served from Postgres for non-search pages if implemented

## 7. Background Jobs

### Queue Groups

- `font-processing`
- `preview-generation`
- `package-generation`
- `search-index`
- `analytics-rollup`
- `cleanup`

### Core Jobs

#### `process-upload`

- validate object exists
- verify checksum and file type
- parse font metadata
- detect family/style grouping
- update draft records
- preserve declared license and compliance context for review

#### `generate-previews`

- build specimen images
- build social share images
- generate family cover derivatives if enabled

#### `generate-family-package`

- collect approved style files
- build zip artifact
- upload package to public storage prefix

#### `sync-search-document`

- build family search document
- upsert into Meilisearch

#### `remove-search-document`

- delete archived or unpublished family from index

#### `aggregate-daily-analytics`

- roll raw events into daily summary tables

#### `cleanup-stale-uploads`

- identify abandoned uploads and temporary files

#### `compliance-retention-check`

- verify terms records referenced by submissions remain internally available
- flag submissions with missing assent metadata

## 8. API Conventions

- version all endpoints under `/api/v1`
- use JSON for all non-download responses
- use `POST` for actions with side effects
- return a stable top-level envelope for paginated endpoints
- keep admin DTOs separate from public DTOs
- never return private contributor contact data from public endpoints

### Error Envelope

Recommended structure:

```json
{
  "error": {
    "code": "FONT_NOT_FOUND",
    "message": "Font family was not found.",
    "details": null,
    "requestId": "req_123"
  }
}
```

## 9. Caching Rules

Cache candidates:

- public filter vocabularies
- published family detail DTOs
- public collections
- search result pages for common queries

Do not cache:

- authenticated admin queue responses without careful invalidation
- mutable draft records
- signed URLs

## 10. Security Controls

- hash passwords with `argon2`
- rotate refresh tokens on every refresh
- enforce role guards on contributor and admin APIs
- rate limit auth, search, and download endpoints
- validate upload MIME type, extension, and actual binary signature
- isolate worker font parsing from public request path
- hash IP addresses before storage in analytics tables
- hash IP addresses before storing contributor assent metadata

## 11. Observability Blueprint

### Log Fields

- `request_id`
- `user_id`
- `role`
- `family_id`
- `style_id`
- `upload_id`
- `job_name`
- `job_id`
- `status_code`
- `duration_ms`

### Metrics

- HTTP request latency by route
- queue depth by queue name
- job duration and failure rate
- download issuance count
- upload processing success rate
- search latency and zero-result rate

## 12. Milestones And Acceptance Criteria

### Milestone A: Foundation

Complete when:

- app boots locally with Postgres, Redis, storage config, and Meilisearch config
- health endpoints reflect dependency readiness
- auth skeleton and role guard structure exist

### Milestone B: Catalog Read APIs

Complete when:

- published families can be listed and fetched by slug
- summary and detail DTOs are stable
- taxonomy vocabularies are exposed for frontend filters

### Milestone C: Upload And Processing

Complete when:

- contributors can upload a source file successfully
- contributors cannot submit without required declaration and profile fields
- processing jobs extract metadata and attach styles to drafts
- malformed fonts fail safely with visible review errors

### Milestone D: Review And Publication

Complete when:

- reviewer can approve or reject a family
- reviewer can inspect contributor declaration and ownership evidence
- approval creates package and search sync jobs
- approved family becomes visible publicly

### Milestone E: Search, Downloads, Analytics

Complete when:

- search works with Amharic and English metadata
- style and family package downloads issue signed URLs
- views and downloads appear in analytics summaries

### Milestone F: Production Hardening

Complete when:

- rate limiting and structured logging are enabled
- backups and restore process are documented
- queue retry and dead-letter behavior are tested

## 13. Recommended Work Sequencing

1. schema and migrations
2. auth and role guards
3. taxonomy, publishers, designers, licenses
4. font families and public read APIs
5. uploads and processing workers
6. admin review APIs
7. search index sync and public search
8. downloads and analytics
9. hardening and deployment

## 14. Explicit Non-Goals For First Build

- microservice decomposition
- payment integration
- paid licensing enforcement
- public social features
- public contributor dashboards
- user-generated collections
- font pair management
