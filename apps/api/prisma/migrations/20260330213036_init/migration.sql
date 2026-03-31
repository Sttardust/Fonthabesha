-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'reviewer', 'contributor');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'invited', 'suspended', 'disabled');

-- CreateEnum
CREATE TYPE "FamilyStatus" AS ENUM ('draft', 'approved', 'archived');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('draft', 'uploaded', 'processing', 'processing_failed', 'ready_for_submission', 'needs_review', 'changes_requested', 'approved', 'rejected', 'archived');

-- CreateEnum
CREATE TYPE "StyleStatus" AS ENUM ('draft', 'approved', 'archived');

-- CreateEnum
CREATE TYPE "UploadProcessingStatus" AS ENUM ('queued', 'processing', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "OwnershipEvidenceType" AS ENUM ('source_url', 'repository_url', 'license_file', 'ownership_statement', 'other_document');

-- CreateEnum
CREATE TYPE "ReviewAction" AS ENUM ('submitted', 'processing_failed', 'request_changes', 'approved', 'rejected', 'archived', 'reprocessed', 'metadata_updated');

-- CreateEnum
CREATE TYPE "CollectionStatus" AS ENUM ('draft', 'published', 'archived');

-- CreateEnum
CREATE TYPE "EventSource" AS ENUM ('public_api', 'admin_dashboard', 'contributor_dashboard', 'system_job');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "legal_full_name" TEXT,
    "country_code" CHAR(2),
    "organization_name" TEXT,
    "phone_number" TEXT,
    "role" "UserRole" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publishers" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "bio_en" TEXT,
    "bio_am" TEXT,
    "website_url" TEXT,
    "country_code" CHAR(2),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "publishers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "designers" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "bio_en" TEXT,
    "bio_am" TEXT,
    "website_url" TEXT,
    "social_links_json" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "designers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "licenses" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "summary_en" TEXT,
    "summary_am" TEXT,
    "full_text_url" TEXT,
    "allows_redistribution" BOOLEAN NOT NULL,
    "allows_commercial_use" BOOLEAN NOT NULL,
    "requires_attribution" BOOLEAN NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "licenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contributor_terms_versions" (
    "id" UUID NOT NULL,
    "version" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "document_url" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "effective_at" TIMESTAMPTZ(6) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contributor_terms_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" UUID NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_am" TEXT,
    "slug" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "font_families" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_am" TEXT,
    "native_name" TEXT,
    "description_en" TEXT,
    "description_am" TEXT,
    "script" TEXT NOT NULL,
    "primary_language" TEXT,
    "category_id" UUID,
    "license_id" UUID,
    "publisher_id" UUID,
    "status" "FamilyStatus" NOT NULL DEFAULT 'draft',
    "is_variable_family" BOOLEAN NOT NULL DEFAULT false,
    "supports_ethiopic" BOOLEAN NOT NULL DEFAULT false,
    "supports_latin" BOOLEAN NOT NULL DEFAULT false,
    "version_label" TEXT,
    "cover_image_key" TEXT,
    "specimen_text_default_am" TEXT,
    "specimen_text_default_en" TEXT,
    "inserted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "font_families_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submissions" (
    "id" UUID NOT NULL,
    "family_id" UUID NOT NULL,
    "owner_user_id" UUID NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'draft',
    "declared_license_id" UUID,
    "ownership_evidence_type" "OwnershipEvidenceType",
    "ownership_evidence_value" TEXT,
    "contributor_statement_text" TEXT NOT NULL,
    "terms_version" TEXT,
    "terms_accepted_at" TIMESTAMPTZ(6),
    "terms_accepted_ip_hash" TEXT,
    "terms_acceptance_name" TEXT,
    "submitted_at" TIMESTAMPTZ(6),
    "reviewed_at" TIMESTAMPTZ(6),
    "reviewed_by_user_id" UUID,
    "last_action_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "font_styles" (
    "id" UUID NOT NULL,
    "family_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "weight_class" INTEGER,
    "weight_label" TEXT,
    "is_italic" BOOLEAN NOT NULL DEFAULT false,
    "is_variable" BOOLEAN NOT NULL DEFAULT false,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "file_key" TEXT,
    "format" TEXT,
    "version_label" TEXT,
    "file_size_bytes" BIGINT,
    "sha256" TEXT,
    "metrics_json" JSONB,
    "axes_json" JSONB,
    "features_json" JSONB,
    "glyph_coverage_json" JSONB,
    "status" "StyleStatus" NOT NULL DEFAULT 'draft',
    "published_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "font_styles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "font_family_designers" (
    "family_id" UUID NOT NULL,
    "designer_id" UUID NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "font_family_designers_pkey" PRIMARY KEY ("family_id","designer_id")
);

-- CreateTable
CREATE TABLE "font_family_tags" (
    "family_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,

    CONSTRAINT "font_family_tags_pkey" PRIMARY KEY ("family_id","tag_id")
);

-- CreateTable
CREATE TABLE "collections" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "title_en" TEXT NOT NULL,
    "title_am" TEXT,
    "description_en" TEXT,
    "description_am" TEXT,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "status" "CollectionStatus" NOT NULL DEFAULT 'draft',
    "created_by" UUID,
    "published_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collection_items" (
    "collection_id" UUID NOT NULL,
    "family_id" UUID NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "collection_items_pkey" PRIMARY KEY ("collection_id","family_id")
);

-- CreateTable
CREATE TABLE "uploads" (
    "id" UUID NOT NULL,
    "uploader_id" UUID NOT NULL,
    "submission_id" UUID NOT NULL,
    "family_id" UUID NOT NULL,
    "original_filename" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "mime_type" TEXT,
    "file_size_bytes" BIGINT,
    "sha256" TEXT,
    "processing_status" "UploadProcessingStatus" NOT NULL DEFAULT 'queued',
    "processing_error" TEXT,
    "uploaded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMPTZ(6),

    CONSTRAINT "uploads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_events" (
    "id" UUID NOT NULL,
    "submission_id" UUID NOT NULL,
    "family_id" UUID NOT NULL,
    "actor_user_id" UUID,
    "action" "ReviewAction" NOT NULL,
    "notes" TEXT,
    "metadata_json" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "download_events" (
    "id" UUID NOT NULL,
    "family_id" UUID NOT NULL,
    "style_id" UUID,
    "user_id" UUID,
    "ip_hash" TEXT,
    "user_agent_hash" TEXT,
    "country_code" CHAR(2),
    "source" "EventSource",
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "download_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "view_events" (
    "id" UUID NOT NULL,
    "family_id" UUID NOT NULL,
    "user_id" UUID,
    "ip_hash" TEXT,
    "source" "EventSource",
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "view_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_events" (
    "id" UUID NOT NULL,
    "query_text" TEXT,
    "normalized_query_text" TEXT,
    "result_count" INTEGER,
    "ip_hash" TEXT,
    "user_id" UUID,
    "source" "EventSource",
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_family_analytics" (
    "family_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "views_count" INTEGER NOT NULL DEFAULT 0,
    "downloads_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "daily_family_analytics_pkey" PRIMARY KEY ("family_id","date")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "publishers_slug_key" ON "publishers"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "designers_slug_key" ON "designers"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "licenses_code_key" ON "licenses"("code");

-- CreateIndex
CREATE UNIQUE INDEX "contributor_terms_versions_version_key" ON "contributor_terms_versions"("version");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tags_slug_key" ON "tags"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "font_families_slug_key" ON "font_families"("slug");

-- CreateIndex
CREATE INDEX "font_families_status_published_at_idx" ON "font_families"("status", "published_at" DESC);

-- CreateIndex
CREATE INDEX "font_families_publisher_id_status_idx" ON "font_families"("publisher_id", "status");

-- CreateIndex
CREATE INDEX "font_families_category_id_status_idx" ON "font_families"("category_id", "status");

-- CreateIndex
CREATE INDEX "submissions_owner_user_id_status_updated_at_idx" ON "submissions"("owner_user_id", "status", "updated_at" DESC);

-- CreateIndex
CREATE INDEX "submissions_family_id_created_at_idx" ON "submissions"("family_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "submissions_status_updated_at_idx" ON "submissions"("status", "updated_at" DESC);

-- CreateIndex
CREATE INDEX "font_styles_family_id_is_default_idx" ON "font_styles"("family_id", "is_default" DESC);

-- CreateIndex
CREATE INDEX "font_styles_sha256_idx" ON "font_styles"("sha256");

-- CreateIndex
CREATE UNIQUE INDEX "font_styles_family_id_slug_key" ON "font_styles"("family_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "collections_slug_key" ON "collections"("slug");

-- CreateIndex
CREATE INDEX "collections_status_published_at_idx" ON "collections"("status", "published_at" DESC);

-- CreateIndex
CREATE INDEX "uploads_submission_id_processing_status_idx" ON "uploads"("submission_id", "processing_status");

-- CreateIndex
CREATE INDEX "uploads_family_id_processing_status_idx" ON "uploads"("family_id", "processing_status");

-- CreateIndex
CREATE INDEX "review_events_submission_id_created_at_idx" ON "review_events"("submission_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "review_events_family_id_created_at_idx" ON "review_events"("family_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "download_events_family_id_created_at_idx" ON "download_events"("family_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "view_events_family_id_created_at_idx" ON "view_events"("family_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "search_events_created_at_idx" ON "search_events"("created_at" DESC);

-- AddForeignKey
ALTER TABLE "font_families" ADD CONSTRAINT "font_families_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "font_families" ADD CONSTRAINT "font_families_license_id_fkey" FOREIGN KEY ("license_id") REFERENCES "licenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "font_families" ADD CONSTRAINT "font_families_publisher_id_fkey" FOREIGN KEY ("publisher_id") REFERENCES "publishers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "font_families"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_declared_license_id_fkey" FOREIGN KEY ("declared_license_id") REFERENCES "licenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "font_styles" ADD CONSTRAINT "font_styles_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "font_families"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "font_family_designers" ADD CONSTRAINT "font_family_designers_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "font_families"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "font_family_designers" ADD CONSTRAINT "font_family_designers_designer_id_fkey" FOREIGN KEY ("designer_id") REFERENCES "designers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "font_family_tags" ADD CONSTRAINT "font_family_tags_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "font_families"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "font_family_tags" ADD CONSTRAINT "font_family_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collections" ADD CONSTRAINT "collections_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_items" ADD CONSTRAINT "collection_items_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "collections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_items" ADD CONSTRAINT "collection_items_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "font_families"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_uploader_id_fkey" FOREIGN KEY ("uploader_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "font_families"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_events" ADD CONSTRAINT "review_events_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_events" ADD CONSTRAINT "review_events_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "font_families"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_events" ADD CONSTRAINT "review_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "download_events" ADD CONSTRAINT "download_events_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "font_families"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "download_events" ADD CONSTRAINT "download_events_style_id_fkey" FOREIGN KEY ("style_id") REFERENCES "font_styles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "download_events" ADD CONSTRAINT "download_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "view_events" ADD CONSTRAINT "view_events_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "font_families"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "view_events" ADD CONSTRAINT "view_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "search_events" ADD CONSTRAINT "search_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_family_analytics" ADD CONSTRAINT "daily_family_analytics_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "font_families"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
