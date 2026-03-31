# Backend

This folder contains the NestJS backend, Prisma schema, Docker setup, and backend environment files.

## Common Commands

- `npm run dev --workspace @fonthabesha/backend`
- `npm run build --workspace @fonthabesha/backend`
- `npm run db:seed --workspace @fonthabesha/backend`
- `npm run prisma:generate --workspace @fonthabesha/backend`

## Auth Mail Flows

- `SMTP_URL` enables real outbound email delivery for account verification and password reset
- without `SMTP_URL`, the backend stores development mail previews in memory
- staff can inspect development previews at `GET /api/v1/internal/mail/previews`
- preview links are built from `FRONTEND_URL`, `FRONTEND_VERIFY_EMAIL_PATH`, and `FRONTEND_RESET_PASSWORD_PATH`

## Auth Hardening

- login, registration, verification-mail, and password-reset requests are rate limited
- rate limiting uses Redis when available and falls back to in-memory counters if Redis is unavailable
- repeated failed logins temporarily lock the targeted account, with a separate network-level lockout for heavy abuse

## Local Files

- `src/` application code
- `prisma/` schema, migrations, and seed
- `docker-compose.yml` local services
- `.env.example` backend environment template
