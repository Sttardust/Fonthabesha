ALTER TYPE "AuthAuditAction" ADD VALUE IF NOT EXISTS 'auth_session_revoke';
ALTER TYPE "AuthAuditAction" ADD VALUE IF NOT EXISTS 'auth_user_sessions_revoke';
ALTER TYPE "AuthAuditAction" ADD VALUE IF NOT EXISTS 'login_lockout_clear';
