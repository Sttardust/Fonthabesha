# Database Schema Draft

## 1. Purpose

This document translates the backend specification into a migration-ready relational schema draft.

It is not a final Prisma schema or SQL migration, but it is close enough to guide the first implementation pass.

## 2. Core Principles

- PostgreSQL is the source of truth
- all primary keys are UUIDs
- tables use `snake_case`
- `created_at` and `updated_at` should exist on mutable core tables
- workflow status should use explicit enums
- large binary files live in object storage, not in Postgres
- public catalog state and moderation state are intentionally separated

## 3. Recommended Enums

### `user_role`

- `admin`
- `reviewer`
- `contributor`

### `user_status`

- `active`
- `invited`
- `suspended`
- `disabled`

### `family_status`

- `draft`
- `approved`
- `archived`

Use family status only for the public catalog object.

### `submission_status`

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

### `style_status`

- `draft`
- `approved`
- `archived`

### `upload_processing_status`

- `queued`
- `processing`
- `completed`
- `failed`

### `ownership_evidence_type`

- `source_url`
- `repository_url`
- `license_file`
- `ownership_statement`
- `other_document`

### `review_action`

- `submitted`
- `processing_failed`
- `request_changes`
- `approved`
- `rejected`
- `archived`
- `reprocessed`
- `metadata_updated`

### `collection_status`

- `draft`
- `published`
- `archived`

### `event_source`

- `public_api`
- `admin_dashboard`
- `contributor_dashboard`
- `system_job`

## 4. Core Tables

### `users`

Columns:

- `id uuid pk`
- `email text not null unique`
- `password_hash text not null`
- `display_name text not null`
- `legal_full_name text`
- `country_code char(2)`
- `organization_name text`
- `phone_number text`
- `role user_role not null`
- `status user_status not null default 'active'`
- `created_at timestamptz not null`
- `updated_at timestamptz not null`

Notes:

- `legal_full_name` should be required before a contributor can submit for review, but it does not have to be required at account creation time.

### `publishers`

Columns:

- `id uuid pk`
- `name text not null`
- `slug text not null unique`
- `bio_en text`
- `bio_am text`
- `website_url text`
- `country_code char(2)`
- `is_active boolean not null default true`
- `created_at timestamptz not null`
- `updated_at timestamptz not null`

### `designers`

Columns:

- `id uuid pk`
- `name text not null`
- `slug text not null unique`
- `bio_en text`
- `bio_am text`
- `website_url text`
- `social_links_json jsonb`
- `created_at timestamptz not null`
- `updated_at timestamptz not null`

### `licenses`

Columns:

- `id uuid pk`
- `code text not null unique`
- `name text not null`
- `summary_en text`
- `summary_am text`
- `full_text_url text`
- `allows_redistribution boolean not null`
- `allows_commercial_use boolean not null`
- `requires_attribution boolean not null`
- `is_active boolean not null default true`
- `created_at timestamptz not null`
- `updated_at timestamptz not null`

### `contributor_terms_versions`

Columns:

- `id uuid pk`
- `version text not null unique`
- `title text not null`
- `document_url text not null`
- `checksum text not null`
- `effective_at timestamptz not null`
- `is_active boolean not null default false`
- `created_at timestamptz not null`

Notes:

- only one row should be active at a time
- use a partial unique index if needed to enforce one active version

### `categories`

Columns:

- `id uuid pk`
- `name text not null`
- `slug text not null unique`
- `created_at timestamptz not null`
- `updated_at timestamptz not null`

### `tags`

Columns:

- `id uuid pk`
- `name_en text not null`
- `name_am text`
- `slug text not null unique`
- `created_at timestamptz not null`
- `updated_at timestamptz not null`

### `font_families`

Columns:

- `id uuid pk`
- `slug text not null unique`
- `name_en text not null`
- `name_am text`
- `native_name text`
- `description_en text`
- `description_am text`
- `script text not null`
- `primary_language text`
- `category_id uuid fk -> categories.id`
- `license_id uuid fk -> licenses.id`
- `publisher_id uuid fk -> publishers.id`
- `status family_status not null default 'draft'`
- `is_variable_family boolean not null default false`
- `supports_ethiopic boolean not null default false`
- `supports_latin boolean not null default false`
- `version_label text`
- `cover_image_key text`
- `specimen_text_default_am text`
- `specimen_text_default_en text`
- `inserted_at timestamptz not null`
- `published_at timestamptz`
- `updated_at timestamptz not null`

Notes:

- this is the public catalog entity
- approval promotes data from a submission into this record

### `submissions`

Columns:

- `id uuid pk`
- `family_id uuid not null fk -> font_families.id`
- `owner_user_id uuid not null fk -> users.id`
- `status submission_status not null default 'draft'`
- `declared_license_id uuid fk -> licenses.id`
- `ownership_evidence_type ownership_evidence_type`
- `ownership_evidence_value text`
- `contributor_statement_text text not null`
- `terms_version text`
- `terms_accepted_at timestamptz`
- `terms_accepted_ip_hash text`
- `terms_acceptance_name text`
- `submitted_at timestamptz`
- `reviewed_at timestamptz`
- `reviewed_by_user_id uuid fk -> users.id`
- `last_action_at timestamptz`
- `created_at timestamptz not null`
- `updated_at timestamptz not null`

Notes:

- this is the moderation object
- a family may have multiple submissions over time
- `contributor_statement_text` should store the exact text the user accepted, not just a reference

### `font_styles`

Columns:

- `id uuid pk`
- `family_id uuid not null fk -> font_families.id`
- `name text not null`
- `slug text not null`
- `weight_class integer`
- `weight_label text`
- `is_italic boolean not null default false`
- `is_variable boolean not null default false`
- `is_default boolean not null default false`
- `file_key text`
- `format text`
- `version_label text`
- `file_size_bytes bigint`
- `sha256 text`
- `metrics_json jsonb`
- `axes_json jsonb`
- `features_json jsonb`
- `glyph_coverage_json jsonb`
- `status style_status not null default 'draft'`
- `published_at timestamptz`
- `created_at timestamptz not null`
- `updated_at timestamptz not null`

Constraints:

- unique index on `(family_id, slug)`

### `font_family_designers`

Columns:

- `family_id uuid not null fk -> font_families.id`
- `designer_id uuid not null fk -> designers.id`
- `sort_order integer not null default 0`

Constraints:

- composite primary key `(family_id, designer_id)`

### `font_family_tags`

Columns:

- `family_id uuid not null fk -> font_families.id`
- `tag_id uuid not null fk -> tags.id`

Constraints:

- composite primary key `(family_id, tag_id)`

### `collections`

Columns:

- `id uuid pk`
- `slug text not null unique`
- `title_en text not null`
- `title_am text`
- `description_en text`
- `description_am text`
- `is_featured boolean not null default false`
- `status collection_status not null default 'draft'`
- `created_by uuid fk -> users.id`
- `published_at timestamptz`
- `created_at timestamptz not null`
- `updated_at timestamptz not null`

### `collection_items`

Columns:

- `collection_id uuid not null fk -> collections.id`
- `family_id uuid not null fk -> font_families.id`
- `sort_order integer not null default 0`

Constraints:

- composite primary key `(collection_id, family_id)`

### `uploads`

Columns:

- `id uuid pk`
- `uploader_id uuid not null fk -> users.id`
- `submission_id uuid not null fk -> submissions.id`
- `family_id uuid not null fk -> font_families.id`
- `original_filename text not null`
- `storage_key text not null`
- `mime_type text`
- `file_size_bytes bigint`
- `sha256 text`
- `processing_status upload_processing_status not null default 'queued'`
- `processing_error text`
- `uploaded_at timestamptz not null`
- `processed_at timestamptz`

### `review_events`

Columns:

- `id uuid pk`
- `submission_id uuid not null fk -> submissions.id`
- `family_id uuid not null fk -> font_families.id`
- `actor_user_id uuid fk -> users.id`
- `action review_action not null`
- `notes text`
- `metadata_json jsonb`
- `created_at timestamptz not null`

Notes:

- use this for immutable workflow history
- do not overwrite or delete review events in normal operation

### `download_events`

Columns:

- `id uuid pk`
- `family_id uuid not null fk -> font_families.id`
- `style_id uuid fk -> font_styles.id`
- `user_id uuid fk -> users.id`
- `ip_hash text`
- `user_agent_hash text`
- `country_code char(2)`
- `source event_source`
- `created_at timestamptz not null`

### `view_events`

Columns:

- `id uuid pk`
- `family_id uuid not null fk -> font_families.id`
- `user_id uuid fk -> users.id`
- `ip_hash text`
- `source event_source`
- `created_at timestamptz not null`

### `search_events`

Columns:

- `id uuid pk`
- `query_text text`
- `normalized_query_text text`
- `result_count integer`
- `ip_hash text`
- `user_id uuid fk -> users.id`
- `source event_source`
- `created_at timestamptz not null`

### `daily_family_analytics`

Columns:

- `family_id uuid not null fk -> font_families.id`
- `date date not null`
- `views_count integer not null default 0`
- `downloads_count integer not null default 0`

Constraints:

- composite primary key `(family_id, date)`

## 5. Recommended Indexes

### High Priority

- `users(email)`
- `font_families(slug)`
- `publishers(slug)`
- `designers(slug)`
- `licenses(code)`
- `categories(slug)`
- `tags(slug)`

### Workflow And Moderation

- `submissions(owner_user_id, status, updated_at desc)`
- `submissions(family_id, created_at desc)`
- `submissions(status, updated_at desc)`
- `uploads(submission_id, processing_status)`
- `uploads(family_id, processing_status)`
- `review_events(submission_id, created_at desc)`
- `review_events(family_id, created_at desc)`

### Public Catalog

- `font_families(status, published_at desc)`
- `font_families(publisher_id, status)`
- `font_families(category_id, status)`
- `font_styles(family_id, is_default desc)`
- `font_styles(sha256)`

### Analytics

- `download_events(family_id, created_at desc)`
- `view_events(family_id, created_at desc)`
- `search_events(created_at desc)`

## 6. Suggested Migration Order

1. enums
2. `users`
3. `publishers`, `designers`, `licenses`, `contributor_terms_versions`, `categories`, `tags`
4. `font_families`
5. `submissions`
6. `font_styles`
7. join tables
8. `collections`, `collection_items`
9. `uploads`, `review_events`
10. analytics tables

## 7. Open Schema Decisions

- whether `script` and `primary_language` should become foreign keys instead of text fields
- whether `organization_name` should later normalize into a separate contributor organization table
- whether `terms_version` on `submissions` should also have a foreign key to `contributor_terms_versions.version` or to its `id`
- whether daily analytics should be partitioned if event volume grows

## 8. First Implementation Recommendation

For the first actual schema pass:

- use text fields for `script` and `primary_language`
- keep `social_links_json`, `metrics_json`, `axes_json`, `features_json`, and `glyph_coverage_json` as `jsonb`
- store `terms_version` as text plus keep the full accepted statement on the submission
- add foreign keys and enums early rather than leaving them implicit
