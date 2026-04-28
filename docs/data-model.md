# Data model

Prisma schema, enums, what the seed creates, and how auth is wired end-to-end.

## Schema overview

Source: `prisma/schema.prisma`. Provider `prisma-client-js`, datasource `postgresql`.

### Core domain

```
Organization 1──* User
             1──* Provider 1──* License
             │              1──* PayerEnrollment
             │              1──* ComplianceCheck
             │              1──1 CredentialingCase
             │
             1──1 BillingPlan
             1──* UsageEvent ──? Invoice
             1──* Invoice
             1──* PaymentMethod
             1──1 Subscription
```

Every owned model has `orgId` + `onDelete: Cascade` for tenant cleanup.

### Tables (selected fields)

| Model | Key fields |
|---|---|
| `Organization` | `id` (cuid), `name`, plus relations |
| `User` | `email` @unique, `passwordHash`, `role: Role`, `orgId` |
| `Provider` | `npi` @unique, `name`, `specialty`, `status: ProviderStatus`, `orgId` |
| `License` | `providerId`, `state`, `number`, `expiresAt`, `status: LicenseStatus`, `workflowId?`; `@@unique([state, number])` |
| `PayerEnrollment` | `providerId`, `payer`, `state`, `status: EnrollmentStatus`, `submittedAt?`, `workflowId?`; `@@unique([providerId, payer, state])` |
| `ComplianceCheck` | `providerId`, `source`, `result`, `checkedAt` |
| `CredentialingCase` | `providerId` @unique, `workflowId` @unique, `status: CaseStatus` |
| `Workflow` | `id` @unique (also used as `workflowId`), `runId`, `type`, `status`, `steps: Json`, `startedAt`, `closedAt`, `updatedAt` |
| `BillingPlan` | `orgId` @unique, `platformFeeCents`, `unitPrice{Credentialing,License,Enrollment,Monitoring}` |
| `UsageEvent` | `orgId`, `type: UsageType`, `providerId?`, `unitCents`, `occurredAt`, `invoiceId?` |
| `Invoice` | `orgId`, `periodStart/End`, `subtotalCents`, `totalCents`, `status: InvoiceStatus`, `lineItems: Json` |
| `PaymentMethod` | `orgId`, `type: PaymentMethodType`, `isDefault`, `stripePaymentMethodId` @unique |
| `Subscription` | `orgId` @unique, `plan: SubscriptionPlan`, `status: SubscriptionStatus`, `currentPeriodStart/End`, `cancelAtPeriodEnd` |

All models carry `createdAt` / `updatedAt`.

### Enums

| Enum | Values |
|---|---|
| `Role` | `ADMIN`, `MEMBER` |
| `ProviderStatus` | `ACTIVE`, `INACTIVE`, `PENDING` |
| `LicenseStatus` | `ACTIVE`, `EXPIRED`, `PENDING`, `REVOKED` |
| `EnrollmentStatus` | `SUBMITTED`, `PENDING`, `APPROVED`, `DENIED` |
| `CaseStatus` | `IN_PROGRESS`, `COMPLETED`, `FAILED` |
| `UsageType` | `CREDENTIALING`, `LICENSE`, `ENROLLMENT`, `MONITORING` |
| `InvoiceStatus` | `OPEN`, `PAID`, `VOID` |
| `PaymentMethodType` | `CARD`, `ACH` |
| `SubscriptionPlan` | `STARTUP`, `GROWTH`, `ENTERPRISE` |
| `SubscriptionStatus` | `ACTIVE`, `PAST_DUE`, `CANCELED`, `TRIALING` |

## Migrations

In `prisma/migrations/`:

1. `20260424152708_init` — initial schema.
2. `20260425194150_add_org_relations_and_timestamps` — `onDelete: Cascade` everywhere + `createdAt`/`updatedAt` on every model.
3. `20260426195523_add_payment_and_subscription_models` — `PaymentMethod` and `Subscription`.

In Docker, migrations are applied via `bunx prisma migrate deploy` on container start.

## Seed (`prisma/seed.ts`)

Idempotency gate: if `admin@assured.test` exists, exit clean.

Creates:

- One organization: `org_acme_health` ("Acme Health System").
- One admin user: `admin@assured.test` / `password123` (bcrypt-hashed, role `ADMIN`).
- One `BillingPlan` with prices listed in `docs/billing.md`.
- Two providers: Dr. Sarah Johnson (Primary Care) and Dr. Michael Chen (Cardiology).
- One `Invoice` to show billing data.

The seed is intentionally minimal — providers, licenses, enrollments, compliance checks, and credentialing cases are created via the app UI or cron. The `Workflow` table is the source of truth for workflow step state; the Vercel Workflow SDK writes to it during execution.

## Prisma client singleton

`lib/db.ts` (the file the original Bun/Turbopack bug surfaced from):

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

Standard pattern: a module-level singleton guarded against hot-reload duplication via `globalThis`.

## Auth flow

Source files: `lib/auth.ts`, `middleware.ts`, `app/api/auth/{login,logout,me}/route.ts`.

```
POST /api/auth/login
  body: { email, password }                       (validated by loginSchema, lib/validators.ts)
  ├─ authenticateUser(email, password)            (lib/auth.ts)
  │    ├─ prisma.user.findUnique({ where: { email } })
  │    └─ bcrypt.compare(password, user.passwordHash)
  ├─ signJWT({ sub: user.id, orgId, role })       (HS256, 1h, jose)
  └─ Set-Cookie: session=<jwt>; HttpOnly; SameSite=Lax; Path=/
                 secure=true in production
```

```
middleware.ts (matches everything except _next/static, _next/image, favicon.ico)
  ├─ publicPaths = ["/login", "/api/auth"] → pass-through
  ├─ no `session` cookie → redirect to /login
  ├─ verifyJWT fails → redirect to /login
  └─ verify ok → forward request with x-user-id, x-org-id, x-user-role headers
```

```
GET  /api/auth/me      → getSessionUser() reads cookie, verifies JWT, returns { userId, orgId, role }
POST /api/auth/logout  → clearSessionCookie()
```

`JWT_SECRET` comes from env; falls back to `dev-secret` only if unset (don't ship that).

## Validation surface

`lib/validators.ts` (Zod) — every Route Handler that takes input parses one of:

- `loginSchema` — `{ email, password (min 6) }`
- `createProviderSchema` — `{ npi (length 10), name, specialty, status, orgId? }`
- `licenseQuerySchema` — `{ status?, state?, expiringInDays? }`
- `complianceQuerySchema` — `{ providerId? }`
- `billingUsageQuerySchema` — `{ period: "current" | "previous" }`
- `providerQuerySchema` — `{ status?, specialty?, search? }`
- `addPaymentMethodSchema` — `{ type, last4, expiryMonth, expiryYear, brand?, setDefault }`
- `createSubscriptionSchema` — `{ plan: STARTUP | GROWTH | ENTERPRISE }`

## Analytics

`lib/analytics.ts` — data aggregation functions for dashboard charts:

- `getTimeToRevenueData(orgId, days)` — Credentialing completion trends by month vs 60-day industry baseline
- `getWorkflowSuccessRates(orgId)` — Status distribution across credentialing, licensing, enrollment, compliance workflows
- `getLicenseExpirationData(orgId)` — Licenses grouped by expiration buckets (0-30, 30-60, 60-90, 90-180, 180+ days)
- `getUsageCostData(orgId, days)` — Monthly costs by product line (credentialing, licensing, enrollment, monitoring)
- `getEnrollmentVelocityData(orgId)` — Payer approval rates and average days-to-approval

All functions use existing Prisma models with no schema changes required. Charts are rendered via Recharts in `components/dashboard/analytics/`.
