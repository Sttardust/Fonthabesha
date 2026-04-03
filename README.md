# Fonthabesha

Full-stack monorepo for the Fonthabesha platform.

## Branching Strategy

- `main`: production-ready only
- `dev`: integration branch
- `feature/*`: all new work branches from `dev`

Recommended flow:

1. branch from `dev`
2. open a PR back into `dev`
3. promote `dev` into `main` only when production-ready

## Project Structure

```text
backend/   NestJS API, Prisma schema, Docker setup
frontend/  Vite React frontend
shared/    shared code placeholder
docs/      planning and architecture docs
```

## Local Development

1. install dependencies

```bash
npm install
```

2. configure env files

- copy `backend/.env.example` to `backend/.env`
- copy `frontend/.env.example` to `frontend/.env`

3. run both apps

```bash
npm run dev
```

Default local URLs:

- backend: `http://localhost:3000`
- worker: background process, no HTTP port
- frontend: `http://localhost:5173`

Useful commands:

- `npm run dev:backend`
- `npm run dev:worker`
- `npm run dev:frontend`
- `npm run build`
- `npm run build:backend`
- `npm run build:frontend`
- `npm run seed:backend`
- `npm run test --workspace @fonthabesha/backend`

## Notes

- uploaded font assets can be served from the backend during local development
- the frontend reads the backend URL from `VITE_API_URL`
- backend auth emails use `SMTP_URL` when configured, or a staff-only dev preview inbox at `GET /api/v1/internal/mail/previews`
- backend auth mail requests are queued through Redis/BullMQ when Redis is available
- local `npm run dev` now starts the backend API, the backend worker, and the frontend together
- set `MAIL_QUEUE_ENABLED=false` when you want auth mail to bypass the queue for deterministic local tests
- set `MAIL_QUEUE_CONSUMER_ENABLED=true` only on the worker process that should consume queued mail jobs
- set `BACKGROUND_JOB_CONSUMER_ENABLED=true` only on the worker process that should consume non-auth jobs like search sync and family package warmup
- set `FONT_PROCESSING_CONSUMER_ENABLED=true` only on the worker process that should consume queued font-processing jobs
- set `BACKGROUND_JOB_QUEUE_ENABLED=false` when you want non-auth background work to stay inline
- set `FONT_PROCESSING_QUEUE_ENABLED=false` when you want upload analysis to stay inline instead of using Redis
- contributor uploads are constrained by file type, file count, size, and per-hour upload limits through the backend env settings
- contributor upload completion now transitions submissions through `processing` until the worker finishes analysis
- set `ALLOW_DEV_HEADER_AUTH=false` to disable the `x-user-email` development auth fallback; production should not rely on that header
- the backend now refuses to boot in production if placeholder JWT secrets, dev-header auth, missing SMTP settings, or localhost public URLs are still configured
- backend auth routes are rate limited for registration, login, verification email requests, and password reset requests
- repeated failed logins now trigger temporary account and network lockouts on the backend
- backend auth also writes persistent audit rows for security-relevant account events
- admin security actions like session revokes and lockout clears now flow into the same auth audit trail
- staff can review those auth audit events through the admin API
- staff can also inspect and revoke refresh sessions through the admin API
- staff can inspect and clear account-level login lockouts through the admin API
- `GET /api/v1/health/metrics` exposes Prometheus-style backend metrics for uptime, memory, dependency status, and submission counts
