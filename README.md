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
- frontend: `http://localhost:5173`

Useful commands:

- `npm run dev:backend`
- `npm run dev:frontend`
- `npm run build`
- `npm run build:backend`
- `npm run build:frontend`
- `npm run seed:backend`

## Notes

- uploaded font assets can be served from the backend during local development
- the frontend reads the backend URL from `VITE_API_URL`
- backend auth emails use `SMTP_URL` when configured, or a staff-only dev preview inbox at `GET /api/v1/internal/mail/previews`
