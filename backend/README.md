# Backend

This folder contains the NestJS backend, Prisma schema, Docker setup, and backend environment files.

## Common Commands

- `npm run dev --workspace @fonthabesha/backend`
- `npm run build --workspace @fonthabesha/backend`
- `npm run db:seed --workspace @fonthabesha/backend`
- `npm run prisma:generate --workspace @fonthabesha/backend`
- `npm run test --workspace @fonthabesha/backend`

## Auth Mail Flows

- `SMTP_URL` enables real outbound email delivery for account verification and password reset
- auth mail requests are queued through Redis/BullMQ when available
- `MAIL_QUEUE_ENABLED=false` disables the queue path and forces direct delivery, which is useful for deterministic local tests
- without `SMTP_URL`, the backend stores development mail previews in memory
- staff can inspect development previews at `GET /api/v1/internal/mail/previews`
- preview links are built from `FRONTEND_URL`, `FRONTEND_VERIFY_EMAIL_PATH`, and `FRONTEND_RESET_PASSWORD_PATH`

## Auth Hardening

- login, registration, verification-mail, and password-reset requests are rate limited
- rate limiting uses Redis when available and falls back to in-memory counters if Redis is unavailable
- repeated failed logins temporarily lock the targeted account, with a separate network-level lockout for heavy abuse
- sensitive auth actions are persisted to `auth_audit_events` for later review and incident investigation
- staff can inspect auth audit activity through `GET /api/v1/admin/auth-audit` and `GET /api/v1/admin/auth-audit/summary`
- staff can inspect and revoke persisted refresh sessions through the admin API
- staff can inspect and clear account-level login lockouts through the admin API

## Local Files

- `src/` application code
- `prisma/` schema, migrations, and seed
- `docker-compose.yml` local services
- `.env.example` backend environment template
