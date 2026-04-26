# Temporal mock

The richest abstraction in the scaffold: an in-process mock that mirrors the `@temporalio/client` surface so the UI can render real-looking workflow timelines without a Temporal worker.

Source: `lib/temporal/`. Five files, one responsibility each.

## Why

Credentialing, licensing, and payer enrollment are multi-day, retry-heavy, human-in-the-loop workflows — exactly Temporal's sweet spot. A real worker would dominate this scaffold's complexity and teach nothing about the UI/UX layer. The interesting part is the **boundary**: a mock that exposes the same `getHandle().describe()` / `fetchHistory()` shape as the real SDK, plus a derive function that turns history events into a UI step model.

When you swap to real Temporal, only `client.ts` changes. `types.ts`, `derive.ts`, and `lifecycle.ts`'s reconciliation logic keep working.

## Module map

| File | Responsibility |
|---|---|
| `lib/temporal/types.ts` | Type definitions mirroring `@temporalio/client` (`WorkflowExecutionStatus`, `HistoryEvent`, `WorkflowExecutionDescription`, `WorkflowHistory`) plus the UI-derived `WorkflowStep`. |
| `lib/temporal/fixtures.ts` | Static workflow definitions (`WORKFLOW_DEFINITIONS`), prefix→type inference, and event-history builders. |
| `lib/temporal/client.ts` | The mock itself: `mockTemporal.workflow.getHandle()` + dev-only `controls` (advance, fail, autoplay). |
| `lib/temporal/derive.ts` | Pure reducer: history events → `WorkflowStep[]`. The same code you'd write against real Temporal. |
| `lib/temporal/lifecycle.ts` | Bridges DB ↔ mock: `registerDbSync`, `reconcileAll`, `startComplianceScheduler`. |

## Workflow definitions

`fixtures.ts:5-17` — four workflow types, each a flat list of activity names:

| Type | Steps | ID prefix |
|---|---|---|
| `credentialing` | `APPLICATION_RECEIVED → PSV_EDUCATION → PSV_DEA → SANCTIONS_CHECK → COMMITTEE_REVIEW → APPROVED` | `cred_` |
| `license` | `APPLICATION_PREP → SUBMITTED → STATE_REVIEW → ISSUED` | `lic_` |
| `enrollment` | `SUBMITTED → PAYER_ACK → FOLLOW_UP → APPROVED` | `enr_` |
| `compliance` | `CHECK_OIG → CHECK_SAM → CHECK_NPDB → COMPLETED` | `comp_` |

`inferType(workflowId)` reads the prefix; unknown prefixes throw.

## Client surface

`lib/temporal/client.ts` exports two things:

```ts
export const mockTemporal = {
  workflow: { getHandle: (id: string) => new MockWorkflowHandle(id) }
};
```

A `MockWorkflowHandle` exposes the same methods you'd call on `@temporalio/client.WorkflowClient.getHandle()`:

- `describe()` → `WorkflowExecutionDescription` (status, runId, startTime, historyLength, taskQueue).
- `fetchHistory()` → `{ events: HistoryEvent[] }`.

State is kept in a `globalThis`-pinned singleton (same trick as `lib/db.ts`) so it survives Next.js dev hot-reloads.

### Dev-only controls (not part of the real Temporal API)

```ts
export const controls = {
  advance(workflowId)             // complete current activity, schedule + start next
  fail(workflowId, reason)        // mark current activity + workflow as failed
  startAuto(workflowId)           // 3–8s random tick; 10% random fail
  stopAuto(workflowId)
  enableAutoPlay() / disableAutoPlay()
  create(workflowId, { status, completedCount })   // hydrate at a specific point
  reset()
  onComplete: (workflowId) => void | null          // fired on workflow completion
  onFail:     (workflowId, reason) => void | null  // fired on workflow failure
};
```

Auto-play is enabled by default in dev/test (`client.ts:288-290`) so workflows feel alive while you click around.

## History → step list (the reducer)

`lib/temporal/derive.ts`:

- `historyToSteps(events)` — folds `ActivityTaskScheduled / Started / Completed / Failed` events into `WorkflowStep[]`. Preserves the order activities were first seen.
- `currentStep(events)` — name of the first running/failed step (or first pending if everything's idle).
- `fullStepList(events, type)` — appends not-yet-scheduled steps from `WORKFLOW_DEFINITIONS[type]` as `PENDING`. This is what `<WorkflowTimeline>` renders.

This file is the production-ready piece: feed it real Temporal `HistoryEvent`s and it works unchanged.

## Lifecycle hooks (DB ↔ mock)

`lib/temporal/lifecycle.ts` is wired in `app/layout.tsx:3-7`:

```ts
registerDbSync();
reconcileAll().catch(() => {});
startComplianceScheduler();
```

### `registerDbSync()`

Sets `controls.onComplete` / `controls.onFail`. When a mock workflow finishes:

| Workflow id prefix | DB write |
|---|---|
| `cred_*` | `CredentialingCase.status` → `COMPLETED` (or `FAILED`) |
| `enr_*` | `PayerEnrollment.status` → `APPROVED` (or `DENIED`) |
| `lic_*` | `License.status` → `ACTIVE` (or `REVOKED`) |
| `comp_*` | If the underlying `ComplianceCheck.result === "FLAG"` (or workflow failed), revoke the provider's `ACTIVE` licenses |

### `reconcileAll()`

At startup (dev only — guarded by `NODE_ENV !== "production"`):

1. Fetches every `CredentialingCase`, `PayerEnrollment`, `License`, `ComplianceCheck` from Postgres.
2. Maps DB status → workflow status (`COMPLETED` / `FAILED` / `RUNNING`).
3. Calls `controls.create()` to hydrate the in-memory mock at that point.
4. Temporarily nulls `onComplete`/`onFail` during reconcile to avoid feedback loops.

The result: refreshing the dashboard shows the same workflows in the same state across restarts.

### `startComplianceScheduler()`

Every **60 seconds** (dev only):

- Find providers with at least one `ACTIVE` license and no `REVOKED` licenses.
- For each, create a new `ComplianceCheck` row (`source: "SCHEDULED_CHECK"`, `result: "CLEAN"`).
- Spin up a `comp_<checkId>` workflow with `controls.create()` + `controls.startAuto()`.
- Auto-play has a 10% failure rate per tick — when a compliance workflow fails, `registerDbSync` revokes the provider's licenses.

This makes the dashboard feel like a live system: monitoring fires, occasional failures cascade into license revocations, the billing page picks them up.

## How the UI consumes it

`components/dashboard/workflow-timeline.tsx` takes `steps: WorkflowStep[]` directly:

```tsx
<WorkflowTimeline steps={fullStepList(events, type)} />
```

The data flow:

```
UI page (RSC)
  └─ GET /api/workflows/:id          (app/api/workflows/[workflowId]/route.ts)
       └─ getWorkflowState(id)        (lib/workflows.ts)
            └─ mockTemporal.workflow.getHandle(id).fetchHistory()
            └─ fullStepList(events, type)
```

In production, swap `mockTemporal.workflow.getHandle()` for the real `@temporalio/client` handle. Everything downstream stays.
