-- AlterTable
ALTER TABLE "uploads" ADD COLUMN     "metadata_json" JSONB,
ADD COLUMN     "processing_warnings_json" JSONB;
