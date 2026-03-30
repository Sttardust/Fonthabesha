# Backend Plan Of Action

## 1. Objective

Build the backend for an Amharic font-sharing platform inspired by Fontshare, but scoped for a realistic first release.

The backend must support:

- public browsing of font families and styles
- metadata-rich font detail pages
- font file uploads and review workflow
- font downloads and usage analytics
- search and filtering for Ethiopic/Amharic use cases
- operational tooling for admins and reviewers

## 2. Product Baseline

Public Fontshare behavior reviewed on 2026-03-30 shows these core surfaces:

- public routes for home, font family details, font pairs, FAQ, licenses, and about
- API-driven catalog listing and search
- rich font metadata including styles, axes, tags, designers, publisher, categories, and download files
- shortlist, account, and publisher flows in the frontend bundle

For Fonthabesha, the recommended first backend release should not try to copy every Fontshare feature.

## 3. Recommended Scope

### MVP

The first backend release should include:

- public catalog API for font families and styles
- full-text and faceted search
- Amharic and English metadata support
- download endpoints for individual styles and family packages
- file ingestion pipeline for TTF, OTF, WOFF, and WOFF2
- metadata extraction from uploaded fonts
- admin and reviewer workflow
- creator/publisher records
- collections support
- basic analytics for views and downloads
- authentication for admins and contributors

### Phase 2

Build after MVP is stable:

- curated font pairs
- user bookmarks or shortlist
- public contributor dashboards
- specimen generation and preview images
- rate-limited public API keys
- moderation notes and approval history UI

### Deferred Unless Explicitly Required

Do not design the first implementation around these:

- cart and checkout
- paid licensing workflows
- trial request workflows
- payouts and revenue sharing
- social features or comments

Those features exist in the Fontshare ecosystem, but they add significant domain complexity and are not necessary for a strong font-sharing MVP.

## 4. Suggested Backend Architecture

### Core Stack

- API framework: `NestJS` with TypeScript
- Database: `PostgreSQL`
- ORM: `Prisma`
- Object storage: `S3-compatible storage` such as AWS S3 or Cloudflare R2
- Queue and background jobs: `Redis + BullMQ`
- Search: `Meilisearch`
- Font processing: `fonttools`, `ttx`, `pyftsubset`, and optional `ots-sanitize`
- Authentication: JWT access tokens with refresh tokens
- Deployment: Dockerized services, with managed Postgres/Redis/Search in production

### Why This Stack

- `NestJS` gives strong module boundaries for auth, catalog, uploads, admin, and analytics.
- `PostgreSQL` is the source of truth for relational metadata and workflow state.
- `S3-compatible storage` is the correct place for large binary files and generated packages.
- `BullMQ` handles slow font processing work outside request/response latency.
- `Meilisearch` is simpler to operate than Elasticsearch for a catalog-heavy MVP.

## 5. Service Boundaries

Use a modular monolith first, not microservices.

Modules:

- `auth`
- `users`
- `publishers`
- `font-families`
- `font-styles`
- `uploads`
- `downloads`
- `collections`
- `search`
- `analytics`
- `admin-review`
- `licenses`
- `system-jobs`

This keeps the system deployable as one application while preserving a clean split for later extraction if needed.

## 6. Delivery Phases

### Phase 0: Discovery And Rules

- confirm feature scope and non-goals
- define supported file formats and license policy
- define contributor roles and moderation rules
- decide whether downloads are only free or also restricted by license

Deliverables:

- finalized backend spec
- acceptance criteria
- initial API and schema decisions

### Phase 1: Platform Foundation

- scaffold NestJS app
- configure Postgres, Redis, S3 client, and Meilisearch
- implement config system, logging, health checks, and migrations
- establish auth, RBAC, and audit logging skeleton

Deliverables:

- runnable backend skeleton
- environment configuration
- CI checks and migration pipeline

### Phase 2: Catalog Domain

- implement publishers, designers, families, styles, tags, categories, scripts, and licenses
- create public catalog endpoints
- support list, detail, and related-font queries
- build slugs and multilingual fields

Deliverables:

- public read APIs
- normalized schema and seed data

### Phase 3: Upload And Processing Pipeline

- direct-to-storage upload initiation
- upload finalization and virus/sanity checks
- extract name tables, axes, script coverage, weight/style info, OpenType features
- generate family zip packages and preview artifacts
- flag invalid or duplicate uploads

Deliverables:

- contributor upload workflow
- async processing jobs
- admin review queue

### Phase 4: Search And Discovery

- index families and styles into Meilisearch
- implement Amharic and English search normalization
- add filters for category, script, license, variable fonts, designer, publisher, and tags
- rank by popularity, recency, and editorial priority

Deliverables:

- search endpoints
- background reindexing jobs

### Phase 5: Downloads, Collections, And Analytics

- secure download URLs
- family package downloads and style downloads
- collections CRUD for admins
- download, view, and search analytics aggregation

Deliverables:

- download service
- collections API
- analytics dashboard data sources

### Phase 6: Hardening And Launch Prep

- rate limiting
- caching
- abuse detection
- backup and restore drills
- SLOs, alerting, dashboards, and production readiness review

Deliverables:

- production-ready backend
- launch checklist

## 7. Data And Workflow Priorities

The most important backend-specific work is not basic CRUD. It is font ingestion quality.

The critical workflow is:

1. contributor uploads source files
2. backend stores raw upload in quarantine storage
3. background job validates and parses font metadata
4. system creates normalized family/style records
5. reviewer approves or rejects the submission
6. approved fonts are indexed and made downloadable

If this workflow is weak, the entire product quality drops quickly.

## 8. Key Backend Decisions

### Use Postgres As Source Of Truth

Do not rely on search indexes or object storage metadata as the canonical record.

### Store Raw And Processed Files Separately

Use bucket prefixes or separate buckets:

- `raw-uploads/`
- `approved-fonts/`
- `packages/`
- `previews/`

### Support Bilingual Metadata

Many entries should support both English and Amharic:

- family name display
- descriptions
- tags
- collection titles

### Model Review State Explicitly

Use status values such as:

- `draft`
- `uploaded`
- `processing`
- `needs_review`
- `approved`
- `rejected`
- `archived`

### Build For Search Early

Do not postpone search modeling. Search drives the user experience for a font catalog.

## 9. Risks

### Product Risks

- unclear licensing policy for redistributed fonts
- inconsistent metadata quality from contributors
- duplicate uploads under different names
- ambiguous ownership of fonts and publishers

### Technical Risks

- malformed font files causing parser failures
- search quality for Amharic text and transliteration
- large binary storage growth
- broken font packages after processing or subsetting

### Operational Risks

- storage egress cost from heavy downloads
- abuse via automated download scraping
- missing audit trail for approvals and removals

## 10. Success Criteria For MVP

The MVP backend is ready when it can:

- ingest and approve a new Ethiopic font family end to end
- expose public list and detail APIs
- return correct search results in English and Amharic metadata
- serve secure downloads for family packages and single styles
- track views and downloads
- support admin review and audit history
- recover from job failures without data corruption

## 11. Product Questions Resolved For V1

The earlier planning questions are considered resolved by the defaults in Section 13.

## 12. Recommended Execution Order

1. use the resolved V1 decisions in this document as the baseline
2. create the schema and domain modules
3. implement uploads and processing before building advanced public APIs
4. add search once normalized metadata exists
5. add analytics and collections
6. harden for production last

## 13. Default Product Decisions For Backend V1

These decisions resolve the open questions above and should be treated as the working product baseline unless you intentionally change scope later.

### Licensing And Submission Policy

- V1 accepts only fonts that can be legally redistributed through the platform.
- Allowed licenses in V1 should be limited to open or free redistribution licenses such as `OFL`, `Apache`, and other explicitly approved free licenses.
- Proprietary fonts with restricted redistribution are out of scope for V1.
- Every submission must include an explicit license record and source or ownership confirmation.
- Every submission must include contributor declaration acceptance and enough contributor identity/contact data for dispute handling.

Reason:

This keeps the backend simple and avoids building gated download logic, custom EULA enforcement, and legal review workflows in the first release.

### User Accounts

- V1 supports authenticated `admin`, `reviewer`, and `contributor` accounts only.
- Public visitors do not need accounts to browse or download fonts.
- Public user profiles, bookmarks, and social features are deferred.

Reason:

Anonymous public access matches the main catalog goal and reduces auth and privacy complexity in the first release.

### Collections

- V1 supports only editorial collections created by admins or reviewers.
- User-created public or private collections are deferred.

Reason:

Editorial collections are straightforward and useful for launch content, while user collections introduce ownership, privacy, and moderation concerns.

### Font Pairs

- Font pairs are deferred to Phase 2.
- The backend should keep the schema and API design extensible enough to add curated pairs later without a major rewrite.

Reason:

Pairs are valuable, but they are not critical to getting a high-quality upload, review, search, and download platform live.

### Language And Script Support

- V1 is optimized for `Amharic` and `Ethiopic` first.
- The schema must remain extensible for other Ethiopian languages that use Ethiopic script, including Tigrinya and Afaan Oromo in Ethiopic orthography if added later.
- Public taxonomy should start with a single script family of `ethiopic` and language metadata should support expansion.

Reason:

This gives a narrow launch scope without hard-coding Amharic-only assumptions into the data model.

### Preview Rendering

- V1 uses both server-side and client-side preview support.
- Server-side generation is used for durable preview assets such as specimen images, OG images, and collection covers.
- Client-side rendering is used for interactive preview text, font size changes, and style switching in the browser.

Reason:

Server-only previews are too rigid for a font discovery product, and client-only previews are insufficient for shareable assets and moderation workflows.

### Search Behavior

- V1 search must index English metadata, Amharic metadata, and curated transliteration aliases when available.
- Search relevance should prioritize exact family-name matches, then aliases, then tags and descriptions.
- Search should be implemented early, not postponed behind catalog CRUD.

### Download Access

- Public downloads are open for approved fonts.
- The backend still records analytics, enforces rate limiting, and issues signed URLs for actual file delivery.

### File Formats

- Accepted upload formats: `TTF`, `OTF`, `WOFF`, `WOFF2`
- Preferred archival source formats: `TTF` and `OTF`
- V1 may derive webfont packages from source files during processing when appropriate.

### Moderation Standard

- Every uploaded family enters a review queue before public publication.
- Review must validate license, metadata completeness, rendering sanity, duplicate risk, and Ethiopic coverage claims.
- Review must also verify ownership evidence presence and contributor declaration/assent records.

### Revised Execution Order

1. use the decisions in this section as the V1 baseline
2. create the schema and module boundaries around this baseline
3. build upload, processing, and review before advanced discovery features
4. add search and download workflows
5. add collections and analytics
6. defer pairs and user personalization until after launch
