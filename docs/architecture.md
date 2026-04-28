# Architecture

How the pieces fit together, the seams designed for production swap-in, and what's intentionally out of scope.

## Runtime diagram

```
┌──────────────────────────────────────────────────────────────────┐
│  Next.js 16.2.4 — App Router (dev: Node runtime + Turbopack)     │
│                                                                  │
│   React Server Components ──▶ Route Handlers (/api/*)            │
│           │                            │                         │
│           │                            ├──▶ Prisma ──▶ Postgres  │
│           │                            │                         │
│           │                            └──▶ lib/workflow/*       │
│           │                                 (Vercel Workflows)   │
│           │                                                      │
│           └──▶ middleware.ts (JWT cookie auth)                   │
└──────────────────────────────────────────────────────────────────┘
```

- **Frontend + backend in one repo** via the Next.js App Router.
- **Vercel Workflows** (`lib/workflow/`) run via Next.js API routes using the Vercel Workflow SDK (`'use workflow'` / `'use step'`). A cron job advances compliance checks. See `docs/workflows.md`.
- **Postgres** stores providers, licenses, enrollments, compliance events, billing data, payment methods, subscriptions.
- **Bootstrap hooks** in `app/layout.tsx` are minimal — no workflow side effects at module load.

## Tech stack

| Choice | Why |
|---|---|
| **Next.js 16.2.4 (App Router)** | Single codebase, RSC for fast data fetches, Route Handlers for the API. |
| **Bun + Node hybrid runtime** | Bun for installs, tests, Prisma CLI, seeds; Node for `next dev` (works around `vercel/next.js#86866`). See `docs/development.md`. |
| **Prisma 5.22 + PostgreSQL 16** | Strong types, migrations, wide team familiarity. |
| **JWT + HTTP-only cookie auth** | Hand-rolled (`jose` + `bcryptjs`); edge-compatible. No third-party. |
| **Vercel Workflows** | Database-backed via Prisma `Workflow` table; Vercel Workflow SDK for execution. |
| **Tailwind v4 + shadcn/ui + lucide-react** | Credible dashboard UI fast; accessible primitives. |
| **Zod** | Input validation on every Route Handler. |
| **Bun test + Playwright** | Native Bun runner for unit/component, Playwright for e2e. |

## Project layout

```
app/
├── (auth)/login/page.tsx
├── api/                          # 13 route.ts files
│   ├── auth/{login,logout,me}/
│   ├── billing/{events,usage,invoices,invoices/[id],invoices/[id]/pay}/
│   ├── compliance/
│   ├── enrollments/
│   ├── licenses/
│   ├── providers/
│   └── workflows/[workflowId]/
├── dashboard/
│   ├── layout.tsx                # sidebar nav
│   ├── page.tsx                  # overview
│   ├── billing/, compliance/, credentialing/, enrollment/, licensing/, roster/
└── layout.tsx                    # root layout
components/
├── ui/                           # shadcn primitives (10 files)
└── dashboard/
    ├── workflow-timeline.tsx     # generic step renderer
    ├── status-badge.tsx, data-table.tsx, logout-button.tsx, workflow-heartbeat.tsx
    └── billing/, compliance/, credentialing/, enrollment/, licensing/
lib/
├── auth.ts                       # jose + bcryptjs + cookie helpers
├── db.ts                         # Prisma client singleton
├── workflow/                     # Vercel Workflow SDK functions + Prisma store/read
├── billing.ts                    # PRICING, rollupUsage, usage/invoice queries
├── stripe-mock.ts                # Stripe-shaped invoice + meter-event primitives
├── compliance.ts, credentialing.ts, enrollment.ts, licenses.ts, providers.ts, workflows.ts
├── validators.ts                 # zod schemas
└── format.ts, utils.ts
prisma/
├── schema.prisma
├── migrations/                   # init, add_org_relations, add_payment_and_subscription
└── seed.ts                       # idempotent
test/
├── setup.ts                      # happy-dom + jest-dom matchers
└── fixtures/index.ts             # makeProvider, makeWorkflow, makeInvoice
e2e/
├── globalSetup.ts                # logs in via API, persists cookies
├── pages/{BasePage,DashboardPage,LoginPage}.ts
├── fixtures/index.ts
└── specs/auth.e2e.ts
middleware.ts                     # JWT verify; protects everything except /login + /api/auth
```

Tests are colocated next to source as `*.test.ts` / `*.test.tsx`. One concept per file.

## Abstraction seams (the interview point)

Every external system has a single file you'd swap for production:

| Seam | File | Production swap |
|---|---|---|
| Workflow orchestration | `lib/workflow/*.ts` | Vercel Workflow SDK — `store.ts`, `read.ts`, `definitions.ts` keep working |
| Billing primitives | `lib/stripe-mock.ts` | `stripe` SDK — same `createInvoice` / `createMeterEvent` shape |
| Auth | `lib/auth.ts` | Auth.js / Clerk — middleware contract stays |
| Database | `lib/db.ts` | Already Prisma; switch `DATABASE_URL` |

`<WorkflowTimeline>` (`components/dashboard/workflow-timeline.tsx`) renders any workflow type from a derived `WorkflowStep[]` (see `lib/workflow/derive.ts`). The reducer is the same code you'd write against real workflow history events.

## Workflow architecture

Workflows are database-backed using a Prisma `Workflow` table and the Vercel Workflow SDK.

1. **Creation** — business logic (`lib/providers.ts`, `lib/enrollment.ts`) calls `start(workflowFn, [workflowId])` when a provider/enrollment is created. The workflow function (`'use workflow'`) calls `ensureRun()` to create a `Workflow` row.
2. **Execution** — steps are `'use step'` functions that write to the `Workflow` row (mark step as `RUNNING` → `COMPLETED`).
3. **Compliance** — Vercel Cron (`0 1 * * *`) hits `GET /api/cron/compliance`, which creates new `ComplianceCheck` rows and starts compliance workflows.
4. **Reads** — UI pages call `getWorkflowState()` which queries the `Workflow` table and derives `WorkflowStep[]` for `<WorkflowTimeline>`.

## Productionization checklist

- Replace `lib/workflow/*.ts` with the real Vercel Workflow SDK runtime; keep `derive.ts` and `types.ts`.
- Replace `lib/stripe-mock.ts` with the real `stripe` SDK; `lib/billing.ts` hooks already call into it.
- Add Auth.js / Clerk if SSO is needed; migrate JWT cookie verify in `middleware.ts`.
- Add Sentry, OpenTelemetry.
- HIPAA: BAA with hosting + DB provider, PHI encryption, access reviews.
- CI: typecheck, lint, `prisma validate`, `bun test`, Playwright e2e.

## Intentionally out of scope

- Real Vercel Workflow SDK deployment tuning (local dev handles most).
- Real Stripe / payment provider.
- RBAC beyond a single role field (`ADMIN | MEMBER`).
- File uploads (credentialing attachments).
- HIPAA-grade audit logging, encryption-at-rest policy, BAA-ready infra.
- Multi-org tenancy enforcement on every query (the seed creates one org, `org_acme_health`).
