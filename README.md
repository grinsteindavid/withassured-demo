# Assured Dashboard (Scaffold)

> A Next.js full-stack dashboard mirroring Assured's B2B healthcare operations platform — provider credentialing, licensing, payer enrollment, network compliance, roster, and usage-based billing. Built for a tech interview.

## Business Context

Read **[BUSINESS_MODEL.md](./BUSINESS_MODEL.md)** first for what Assured does, how they make money, and how each screen in this dashboard ties back to a revenue line. The rest of this README assumes that context.

---

## 1. Architecture at a glance

```
┌───────────────────────────────────────────────────────────────┐
│                     Next.js 15 (Bun runtime)                  │
│                                                               │
│   React Server Components  ──▶  Route Handlers (/api/*)       │
│           │                              │                    │
│           │                              ├──▶ Prisma ──▶ Postgres + pgvector
│           │                              │                    │
│           │                              └──▶ Temporal client (ASSUMED, mocked in lib/temporal-mock.ts)
│           │                                                    
│           └──▶ middleware.ts (JWT cookie auth)                │
└───────────────────────────────────────────────────────────────┘
```

- **Frontend + backend in one repo** via the Next.js App Router.
- **Temporal.io is assumed to exist** as a separate service. This scaffold does **not** run a worker. Instead, `lib/temporal-mock.ts` returns canned workflow state so the UI can render real-looking timelines. Swapping it for `@temporalio/client` is a single-file change.
- **PostgreSQL + pgvector** stores providers, licenses, enrollments, compliance events, and billing data. The `pgvector` extension is wired up for future semantic search over credentialing documents.

---

## 2. Tech stack & rationale

| Choice | Why |
|---|---|
| **Next.js 15 (App Router)** | Single codebase, Server Components for fast data fetches, Route Handlers for the API. Assured's own marketing site is Next.js-shaped. |
| **Bun** | Fast installs, TS-native, single binary for runtime + package manager + test runner. |
| **Prisma ORM** | Most common ORM at Series A — strong types, migrations, great DX, wide team familiarity. |
| **PostgreSQL + pgvector** | Relational core + a vector column for embedding-based matching on provider documents and policies. |
| **JWT + HTTP-only cookie auth** | Hand-rolled, no third-party. Demonstrates fundamentals; easy to swap for Auth.js/Clerk later. |
| **Temporal.io (assumed)** | Credentialing / enrollment are multi-day, retry-heavy, human-in-the-loop workflows — exactly Temporal's sweet spot. Not implemented here; mocked at the API boundary. |
| **Tailwind + shadcn/ui + lucide-react** | Credible dashboard UI fast; accessible primitives. |
| **Zod** | Input validation on every Route Handler and form. |
| **bcryptjs + jose** | Password hashing + edge-compatible JWT signing/verification for `middleware.ts`. |

### Why these over the obvious alternatives

- **Prisma vs Drizzle** — Drizzle is trendier, but Prisma is still the default in most Series-A codebases and interview panels. Picking Prisma demonstrates pragmatism.
- **JWT-in-cookie vs NextAuth/Clerk** — The ask was explicit: no third-party. Rolling it by hand also shows you understand the auth primitives NextAuth hides.
- **Mocked Temporal vs a real worker** — A real worker would dominate the scaffold's complexity and teach nothing about the UI/UX layer, which is the point of the interview. The abstraction boundary (`lib/temporal-mock.ts`) is the interesting part.
- **pgvector included even though unused at UI level** — Signals awareness of where the product naturally grows (semantic search over PSV docs, policy matching).

---

## 3. Project structure

```
assured-test/
├── app/
│   ├── (auth)/
│   │   └── login/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx              # sidebar + topbar
│   │   ├── page.tsx                # overview / KPIs
│   │   ├── credentialing/page.tsx
│   │   ├── licensing/page.tsx
│   │   ├── enrollment/page.tsx
│   │   ├── compliance/page.tsx
│   │   ├── roster/page.tsx
│   │   └── billing/page.tsx
│   └── api/
│       ├── auth/{login,logout,me}/route.ts
│       ├── providers/route.ts
│       ├── licenses/route.ts
│       ├── enrollments/route.ts
│       ├── compliance/route.ts
│       ├── workflows/[workflowId]/route.ts   # mocked Temporal reads
│       └── billing/
│           ├── usage/route.ts
│           ├── invoices/route.ts
│           ├── invoices/[id]/route.ts
│           └── events/route.ts
├── components/
│   ├── ui/                        # shadcn primitives
│   └── dashboard/
│       ├── workflow-timeline.tsx  # generic renderer for any workflow
│       ├── status-badge.tsx
│       ├── data-table.tsx
│       └── billing/
├── lib/
│   ├── auth.ts                    # jwt sign/verify, cookie helpers
│   ├── db.ts                      # Prisma client singleton
│   ├── temporal-mock.ts           # canned workflow responses
│   ├── billing.ts                 # pricing + rollup logic
│   └── validators.ts              # zod schemas
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── middleware.ts                  # protects (dashboard) + /api except auth
├── .env.example
└── README.md
```

File-size discipline: one concept per file, short focused functions, descriptive names.

---

## 4. Prerequisites

- **Bun ≥ 1.1** — `curl -fsSL https://bun.sh/install | bash`
- **PostgreSQL 15+ with pgvector** — easiest via Docker:
  ```bash
  docker run -d --name assured-pg \
    -e POSTGRES_PASSWORD=postgres \
    -e POSTGRES_DB=assured \
    -p 5432:5432 \
    pgvector/pgvector:pg16
  ```
- Node-compatible shell (macOS/Linux).

---

## 5. Setup

```bash
# 1. Scaffold
bun create next-app assured-test --typescript --tailwind --app --src-dir=false --import-alias "@/*"
cd assured-test

# 2. Dependencies
bun add @prisma/client jose bcryptjs zod clsx tailwind-merge lucide-react class-variance-authority
bun add -d prisma @types/bcryptjs

# 3. shadcn/ui
bunx shadcn@latest init
bunx shadcn@latest add button card table badge input label dialog dropdown-menu separator tabs

# 4. Env
cp .env.example .env
# Fill in:
#   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/assured"
#   JWT_SECRET="change-me-32-bytes-min"
#   TEMPORAL_ADDRESS="localhost:7233"   # documented but unused

# 5. Database
bunx prisma migrate dev --name init
bunx prisma db execute --stdin <<< "CREATE EXTENSION IF NOT EXISTS vector;"
bun run db:seed

# 6. Dev server
bun dev
```

Default seeded login: `admin@assured.test` / `password123`.

---

## 6. Data model (Prisma sketch)

```prisma
model Organization { id String @id @default(cuid())  name String  plan BillingPlan? }

model User         { id String @id @default(cuid())  email String @unique  passwordHash String  role Role @default(MEMBER)  orgId String }

model Provider {
  id        String   @id @default(cuid())
  npi       String   @unique
  name      String
  specialty String
  status    ProviderStatus
  orgId     String
  // future: embedding for semantic search
  embedding Unsupported("vector(1536)")?
  licenses          License[]
  enrollments       PayerEnrollment[]
  complianceChecks  ComplianceCheck[]
  credentialingCase CredentialingCase?
}

model License           { id String @id @default(cuid())  providerId String  state String  number String  expiresAt DateTime  status LicenseStatus  workflowId String? }
model PayerEnrollment   { id String @id @default(cuid())  providerId String  payer String  state String  status EnrollmentStatus  submittedAt DateTime?  workflowId String? }
model ComplianceCheck   { id String @id @default(cuid())  providerId String  source String  result String  checkedAt DateTime }
model CredentialingCase { id String @id @default(cuid())  providerId String @unique  workflowId String  status CaseStatus }

// --- Billing ---
model BillingPlan { id String @id @default(cuid())  orgId String @unique  platformFeeCents Int  unitPriceCredentialing Int  unitPriceLicense Int  unitPriceEnrollment Int  unitPriceMonitoring Int }

model UsageEvent {
  id         String   @id @default(cuid())
  orgId      String
  type       UsageType    // CREDENTIALING | LICENSE | ENROLLMENT | MONITORING
  providerId String?
  unitCents  Int
  occurredAt DateTime @default(now())
  invoiceId  String?
}

model Invoice {
  id           String   @id @default(cuid())
  orgId        String
  periodStart  DateTime
  periodEnd    DateTime
  subtotalCents Int
  totalCents   Int
  status       InvoiceStatus @default(OPEN)   // OPEN | PAID | VOID
  lineItems    Json
  events       UsageEvent[]
}
```

Enums (`Role`, `ProviderStatus`, `LicenseStatus`, `EnrollmentStatus`, `CaseStatus`, `UsageType`, `InvoiceStatus`) defined in `schema.prisma`.

---

## 7. Pages & mock API endpoints

Every workflow-driven page uses the same `<WorkflowTimeline workflowId={...} />` component that calls `GET /api/workflows/:id` — a mocked read-through to Temporal.

### 7.1 Provider Credentialing Status (`/credentialing`)

- `GET /api/providers?status=IN_PROGRESS`
- `GET /api/workflows/:id` → steps: `APPLICATION_RECEIVED → PSV_EDUCATION → PSV_DEA → SANCTIONS_CHECK → COMMITTEE_REVIEW → APPROVED`

```json
// GET /api/workflows/cred_01H...
{
  "workflowId": "cred_01H...",
  "type": "credentialing",
  "status": "RUNNING",
  "currentStep": "SANCTIONS_CHECK",
  "steps": [
    { "name": "APPLICATION_RECEIVED", "status": "COMPLETED", "at": "2026-04-20T09:00:00Z" },
    { "name": "PSV_EDUCATION",        "status": "COMPLETED", "at": "2026-04-20T14:12:00Z" },
    { "name": "PSV_DEA",              "status": "COMPLETED", "at": "2026-04-21T10:44:00Z" },
    { "name": "SANCTIONS_CHECK",      "status": "RUNNING" },
    { "name": "COMMITTEE_REVIEW",     "status": "PENDING" },
    { "name": "APPROVED",             "status": "PENDING" }
  ]
}
```

### 7.2 Licensing (`/licensing`)

- `GET /api/licenses?expiringInDays=60`
- Workflow steps: `APPLICATION_PREP → SUBMITTED → STATE_REVIEW → ISSUED`.

### 7.3 Payer Enrollment (`/enrollment`)

- `GET /api/enrollments`
- Workflow steps: `SUBMITTED → PAYER_ACK → FOLLOW_UP → APPROVED` (with retries).

### 7.4 Compliance Monitoring (`/compliance`)

- `GET /api/compliance?providerId=...`
- Returns alert feed: sanctions, license lapses, OIG LEIE hits.

### 7.5 Provider Roster (`/roster`)

- `GET /api/providers` with filters (`specialty`, `state`, `status`).
- `POST /api/providers` to add (Zod-validated).

### 7.6 Billing (`/billing`) — **mocked**

See section **9. Mocked billing** below.

---

## 8. Workflow rendering (the point of this scaffold)

The UI never talks to Temporal directly. The flow is:

```
UI ─▶ GET /api/workflows/:id ─▶ lib/temporal-mock.ts ─▶ canned JSON
                                                │
                                                └── (later) @temporalio/client.describeWorkflow()
```

`<WorkflowTimeline>` is a generic component that:

- Renders each step as a node with a status badge (`COMPLETED | RUNNING | PENDING | FAILED`).
- Highlights the current step.
- Shows retry counts and last activity timestamp.
- Polls every 5 seconds while `status === "RUNNING"`.

The mock returns different canned traces keyed by workflow type embedded in the id prefix (`cred_`, `lic_`, `enr_`). Replacing the mock is a one-file change.

---

## 9. Mocked billing

**Pricing model surfaced in the UI:**

- Platform fee: **$1,500 / month / organization**
- Per-credentialing file: **$199**
- Per-license application/renewal: **$99**
- Per-payer enrollment submission: **$149**
- Per-provider monitoring: **$29 / provider / month**

**How it works in the scaffold:**

1. Each mocked workflow completion triggers an internal `POST /api/billing/events` that writes a `UsageEvent` with the correct `unitCents`.
2. The seed script pre-populates 30–60 days of `UsageEvent` rows across a few providers so the UI is non-empty on first run.
3. `lib/billing.ts` exposes:
   - `getCurrentUsage(orgId)` — aggregates open (uninvoiced) events.
   - `closePeriod(orgId, periodEnd)` — groups events into an `Invoice`, computes totals.
   - `markInvoicePaid(invoiceId)` — flips status to `PAID`.
4. `/billing` page shows:
   - Current-period usage cards (count × unit price per action type).
   - Running total + platform fee.
   - Invoice history table with download (JSON) and **Pay** button (mocked).

**API:**

| Endpoint | Purpose |
|---|---|
| `GET /api/billing/usage?period=current` | Aggregated open events for the current period. |
| `GET /api/billing/invoices` | Invoice history. |
| `GET /api/billing/invoices/:id` | Line-item detail. |
| `POST /api/billing/events` | Internal — records a usage event. |
| `POST /api/billing/invoices/:id/pay` | Mocked payment. |

**Example response — current usage:**

```json
{
  "periodStart": "2026-04-01T00:00:00Z",
  "periodEnd":   "2026-04-30T23:59:59Z",
  "platformFeeCents": 150000,
  "lines": [
    { "type": "CREDENTIALING", "count": 12, "unitCents": 19900, "subtotalCents": 238800 },
    { "type": "LICENSE",       "count":  8, "unitCents":  9900, "subtotalCents":  79200 },
    { "type": "ENROLLMENT",    "count": 15, "unitCents": 14900, "subtotalCents": 223500 },
    { "type": "MONITORING",    "count": 42, "unitCents":  2900, "subtotalCents": 121800 }
  ],
  "subtotalCents": 663300,
  "totalCents":    813300
}
```

**Why this shape:** in production, `lib/billing.ts` is the only file that changes when swapping to Stripe metered billing — events become Stripe `MeterEvent`s, invoices become Stripe `Invoice`s. The Route Handlers and UI stay the same.

---

## 10. Auth flow

```
login form ──POST──▶ /api/auth/login
                       │  bcrypt.compare(pwd, user.passwordHash)
                       │  jose.SignJWT({ sub: user.id, orgId, role })
                       └─ Set-Cookie: session=<jwt>; HttpOnly; Secure; SameSite=Lax; Path=/

middleware.ts  (runs on every request to /(dashboard) and protected /api)
   └─ jose.jwtVerify(cookie) → attach user to request headers or 401

/api/auth/me  ──▶  returns the current user for client hydration
/api/auth/logout ──▶ clears the cookie
```

- Secrets in `JWT_SECRET`; never shipped to the client.
- Middleware uses `jose` (edge-compatible) so it runs in Vercel Edge if deployed there.
- Role is a single enum (`ADMIN | MEMBER`); real RBAC is out of scope.

---

## 11. Scripts

```json
{
  "scripts": {
    "dev":        "next dev",
    "build":      "next build",
    "start":      "next start",
    "lint":       "next lint",
    "db:migrate": "prisma migrate dev",
    "db:seed":    "bun run prisma/seed.ts",
    "db:studio":  "prisma studio",
    "test":       "bun test"
  }
}
```

---

## 12. Best practices applied

- **Server Components by default**, Client Components only where interaction requires (`"use client"`).
- **Every Route Handler validates input with Zod** and returns typed JSON.
- **Prisma client is a module-level singleton** (`lib/db.ts`) guarded against hot-reload duplication.
- **Small focused files**, one concept per file, descriptive module names.
- **No secrets in client bundles** — all env access behind `lib/*` modules.
- **Edge-compatible auth** via `jose` so middleware is cheap.
- **Abstraction seams at every external boundary** — `lib/temporal-mock.ts`, `lib/billing.ts` — so swapping real implementations is localized.

---

## 13. Intentionally out of scope

- Real Temporal worker + activities.
- Real Stripe / payment provider.
- RBAC beyond a single role field.
- File uploads (credentialing attachments).
- HIPAA-grade audit logging, encryption-at-rest policy, BAA-ready infra.
- End-to-end test suite (one unit test example is enough for the interview).

## 14. Productionizing checklist

- Wire real `@temporalio/client` in place of `lib/temporal-mock.ts`.
- Wire Stripe metered billing in `lib/billing.ts`.
- Add Auth.js or Clerk if SSO / social login is needed.
- Add Sentry, OpenTelemetry, rate limiting (e.g. `@upstash/ratelimit`).
- Add audit log table + middleware.
- HIPAA: BAA with hosting + DB provider, PHI encryption, access reviews.
- CI: typecheck, lint, `prisma validate`, unit + Playwright e2e.
