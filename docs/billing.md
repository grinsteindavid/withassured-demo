# Billing

How the metered billing model works in this scaffold, the `lib/billing.ts` surface, and the Stripe-shaped primitives in `lib/stripe-mock.ts` that map 1:1 to the real Stripe API.

## Pricing

Hard-coded in `lib/billing.ts:4-10` (`PRICING`) and seeded into `BillingPlan` for the demo org by `prisma/seed.ts`:

| Item | Cents | Display |
|---|---:|---|
| Platform fee (per org / month) | `150_000` | $1,500 |
| Per credentialing file | `19_900` | $199 |
| Per license application / renewal | `9_900` | $99 |
| Per payer enrollment submission | `14_900` | $149 |
| Per provider monitoring (per month) | `2_900` | $29 |

## Flow

```
Mock workflow completes
  │
  ▼  controls.onComplete(workflowId)        (registered in lib/temporal/lifecycle.ts)
  │
  ▼  POST /api/billing/events { type, providerId? }
  │     │
  │     ├─ recordUsageEvent(type, providerId, orgId)   (lib/billing.ts)
  │     │    ├─ prisma.usageEvent.create({ orgId, type, unitCents })
  │     │    └─ createMeterEvent({ event_name, customer, value: 1 })  (lib/stripe-mock.ts)
  │
  ▼  /dashboard/billing reads usage + invoices
       └─ getCurrentUsage(period, orgId)
       └─ listAllInvoices(orgId)            (DB rows + mock-Stripe rows merged)
```

The seed pre-populates a few `UsageEvent` rows so the page is non-empty on first load.

## `lib/billing.ts` surface

| Export | Purpose |
|---|---|
| `PRICING` | Const pricing table (above). |
| `rollupUsage({ platformFeeCents, events })` | Pure: groups events by `type`, sums `unitCents`, adds platform fee. Returns `{ platformFeeCents, lines, subtotalCents, totalCents }`. |
| `periodRange("current" \| "previous", now?)` | Returns `{ periodStart, periodEnd }` for calendar-month buckets. |
| `getCurrentUsage(period, orgId)` | Queries open (uninvoiced) `UsageEvent`s in the period, returns rolled-up totals. |
| `listAllInvoices(orgId)` | Merges `prisma.invoice.findMany()` with `lib/stripe-mock.listInvoices()`, sorted by `periodStart` desc. |
| `getInvoiceById(id, orgId)` | Tenant-scoped fetch with line-item events. |
| `isValidUsageType(type)` | Type guard for `"CREDENTIALING" \| "LICENSE" \| "ENROLLMENT" \| "MONITORING"`. |
| `recordUsageEvent(type, providerId?, orgId?)` | Creates the DB row + the Stripe mock meter event. |
| `processInvoicePayment(id, paymentMethodId?)` | Tries the mock Stripe payment first; falls back to a direct DB status flip. |

## `lib/stripe-mock.ts` surface

A deliberately Stripe-shaped in-memory store. Object names match real Stripe types so the swap is mechanical.

| Export | Stripe equivalent |
|---|---|
| `createInvoice({ customerId, lines, autoAdvance? })` | `stripe.invoices.create()` |
| `payInvoice(invoiceId)` | `stripe.invoices.pay()` |
| `createMeterEvent({ event_name, customer, timestamp?, value? })` | `stripe.billing.meterEvents.create()` |
| `getSubscriptionItems(customerId)` | Aggregated meter values by event_name |
| `listInvoices(customerId?)` | `stripe.invoices.list()` |
| `getInvoice(invoiceId)` | `stripe.invoices.retrieve()` |
| `resetMockState()` | (test helper, no Stripe equivalent) |

Types: `StripeInvoice`, `StripeInvoiceLine`, `MeterEvent`. Statuses: `"draft" | "open" | "paid" | "void"`.

## API endpoints

All under `app/api/billing/`. Auth-required (the dashboard pages are inside `middleware.ts`'s protected scope).

| Method | Path | Purpose | Source |
|---|---|---|---|
| `GET` | `/api/billing/usage?period=current\|previous` | Rolled-up open events for the period. | `app/api/billing/usage/route.ts` |
| `GET` | `/api/billing/invoices` | Invoice list (DB + mock). | `app/api/billing/invoices/route.ts` |
| `GET` | `/api/billing/invoices/:id` | Single invoice with events. | `app/api/billing/invoices/[id]/route.ts` |
| `POST` | `/api/billing/invoices/:id/pay` | Mocked payment; flips status to `PAID`. | `app/api/billing/invoices/[id]/pay/route.ts` |
| `POST` | `/api/billing/events` | Internal — records a usage event. Body: `{ type, providerId? }`. | `app/api/billing/events/route.ts` |

## Example response — current usage

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

## UI components

`components/dashboard/billing/`:

| File | Renders |
|---|---|
| `usage-cards.tsx` / `usage-card.tsx` | Per-line usage summary cards. |
| `invoice-table.tsx` | Invoice history with status badges. |
| `pay-button.tsx` | Calls `POST /api/billing/invoices/:id/pay`. |

## Production swap

`lib/billing.ts` is the only file that changes when migrating to Stripe metered billing:

1. Replace `import { … } from "@/lib/stripe-mock"` with `import Stripe from "stripe"; const stripe = new Stripe(...)`.
2. Map `recordUsageEvent` → `stripe.billing.meterEvents.create()`.
3. Map `processInvoicePayment` → `stripe.invoices.pay()`.

Route handlers and UI stay identical.
