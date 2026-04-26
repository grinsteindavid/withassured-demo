# Getting started

Docker-first. From a fresh checkout to a logged-in dashboard in three commands.

## Prerequisites

- **Docker Desktop** (or any Docker engine + Compose v2). Nothing else is required to run the app.
- For native-host development without Docker, see `docs/development.md` (§ Native alternative).

## 1. Clone and configure env

```bash
cp .env.example .env
```

`.env` variables (all have sensible defaults via `docker-compose.yml` interpolation, so editing is optional for local use):

| Variable | Purpose | Default in compose |
|---|---|---|
| `DATABASE_URL` | Postgres connection string. **Inside the container** the db host is `db`, not `localhost`. | `postgresql://postgres:postgres@db:5432/assured` |
| `JWT_SECRET` | HS256 signing key for session JWT. | `development-secret-…` (override for anything non-local) |
| `TEMPORAL_ADDRESS` | Documented but unused — the mock is in-process. | `localhost:7233` |
| `E2E_USER_EMAIL` | Playwright login (must match a seeded user). | `admin@assured.test` |
| `E2E_USER_PASSWORD` | Playwright password. | `password123` |

## 2. Start the app

```bash
docker compose up app
```

This builds the image once (Bun base + Node binary copied in for `next dev`), then runs:

1. `bunx prisma generate` — emits the Prisma client.
2. `bunx prisma migrate deploy` — applies migrations under `prisma/migrations/`.
3. `bun run db:seed` — runs `prisma/seed.ts` (idempotent; skips if `admin@assured.test` already exists).
4. `node node_modules/next/dist/bin/next dev` — Next.js dev server with Turbopack on port 3000.

You'll see logs like `[compliance] Scheduler started (60s interval)` and `[workflow] cred_01 reconciled to COMPLETED (DB: COMPLETED)` once the lifecycle hooks fire.

## 3. Log in

Open `http://localhost:3000/login` and sign in:

- **Email**: `admin@assured.test`
- **Password**: `password123`

You'll land on `/dashboard` with seeded providers, licenses, enrollments, compliance checks, and a billing summary.

## Optional: Prisma Studio

```bash
docker compose up studio
```

Opens Prisma Studio on `http://localhost:5555` against the same dev database. Browse / edit any model.

## Tearing down

```bash
docker compose down              # stops services, keeps volumes
docker compose down -v           # also wipes the postgres volume (full reset)
```

## Common adjustments

- **Different port**: change the `ports` mapping in `docker-compose.yml` (`app` service, default `"3000:3000"`).
- **Persist `.next` cache between rebuilds**: the anonymous volume `/app/.next` is recreated on each container removal. Replace with a named volume in `docker-compose.yml` if you want persistence.
- **Run only the database**: `docker compose up db` — useful when running `next dev` natively on the host (see `docs/development.md`).

## Next steps

- `docs/development.md` — daily dev loop, Bun/Node runtime split, debugging.
- `docs/data-model.md` — what the seed creates and how auth works.
- `docs/temporal-mock.md` — how the workflow mock advances and reconciles.
