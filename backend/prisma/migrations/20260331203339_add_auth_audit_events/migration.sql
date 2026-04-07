-- CreateEnum
CREATE TYPE "AuthAuditAction" AS ENUM ('register', 'login', 'password_change', 'password_reset_request', 'password_reset_confirm', 'email_verification_request', 'email_verification_confirm', 'refresh', 'logout');

-- CreateEnum
CREATE TYPE "AuthAuditOutcome" AS ENUM ('success', 'failure', 'throttled');

-- CreateTable
CREATE TABLE "auth_audit_events" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "email" TEXT,
    "action" "AuthAuditAction" NOT NULL,
    "outcome" "AuthAuditOutcome" NOT NULL,
    "ip_hash" TEXT,
    "user_agent_hash" TEXT,
    "metadata_json" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "auth_audit_events_user_id_created_at_idx" ON "auth_audit_events"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "auth_audit_events_email_created_at_idx" ON "auth_audit_events"("email", "created_at" DESC);

-- CreateIndex
CREATE INDEX "auth_audit_events_action_outcome_created_at_idx" ON "auth_audit_events"("action", "outcome", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "auth_audit_events" ADD CONSTRAINT "auth_audit_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
