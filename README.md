# Assured Dashboard

> Next.js 16 full-stack scaffold mirroring [Assured](https://withassured.com)'s healthcare ops platform — provider credentialing, licensing, payer enrollment, compliance monitoring, and metered billing. Built for a tech interview.

## What's in here

- **App Router + Route Handlers** — RSC-driven UI, all API in `app/api/*`.
- **Temporal-shaped mock** — `lib/temporal/` exposes the same surface as `@temporalio/client`; swapping for a real worker is a single-file change.
- **Stripe-shaped mock** — `lib/stripe-mock.ts` mirrors the real Stripe invoices/meter-events API for one-shot migration later.
- **Hand-rolled JWT cookie auth** — `lib/auth.ts` + `middleware.ts`, no third-party SDK.
- **Bun + Node hybrid runtime** in Docker — Bun for installs/tests/Prisma/seeds, Node for `next dev` (works around [`vercel/next.js#86866`](https://github.com/vercel/next.js/issues/86866)).

## Quick start

```bash
cp .env.example .env
docker compose up app
```

Open `http://localhost:3000/login`. Sign in with `admin@assured.test` / `password123`.

Optional: `docker compose up studio` for Prisma Studio on `:5555`.

Full setup, env vars, and tear-down: see `docs/getting-started.md`.

## Documentation

| Topic | When to read it |
|---|---|
| [`docs/business-model.md`](docs/business-model.md) | Context — what Assured does, who they serve, how each page maps to revenue. |
| [`docs/architecture.md`](docs/architecture.md) | Tech stack, runtime diagram, abstraction seams, productionization checklist. |
| [`docs/getting-started.md`](docs/getting-started.md) | Docker quickstart, env variables, login, optional Prisma Studio. |
| [`docs/development.md`](docs/development.md) | Daily dev loop, Bun/Node runtime split, debugging, native-host alternative. |
| [`docs/data-model.md`](docs/data-model.md) | Prisma schema, enums, migrations, seed data, full auth flow. |
| [`docs/temporal-mock.md`](docs/temporal-mock.md) | The richest piece: in-process workflow mock, derive reducer, lifecycle hooks. |
| [`docs/billing.md`](docs/billing.md) | Pricing, `UsageEvent` flow, Stripe-shaped mock, billing API. |
| [`docs/testing.md`](docs/testing.md) | `bun test` for units/components, Playwright for e2e. |

## Tech

`Next.js 16.2.4` · `React 19` · `Prisma 5.22 + PostgreSQL 16` · `Bun + Node hybrid` · `Tailwind v4 + shadcn/ui` · `jose` · `bcryptjs` · `zod` · `Playwright`

## AI agent files

`AGENTS.md` and `CLAUDE.md` are project-level rules consumed by AI coding agents. They're not user docs — leave them alone unless updating agent behavior.
