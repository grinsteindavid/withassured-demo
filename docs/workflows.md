# Workflows

Workflow orchestration using the Vercel Workflow SDK (`'use workflow'` / `'use step'`) backed by a Prisma `Workflow` table. Compliance checks are driven by Vercel Cron.

Source: `lib/workflow/`. Six files, one responsibility each.

## Why

Credentialing, licensing, and payer enrollment are multi-day, retry-heavy, human-in-the-loop workflows. The Vercel Workflow SDK provides durable execution with step-level persistence, and the Prisma `Workflow` table stores step state so the UI can render timelines without an external worker.

## Module map

| File | Responsibility |
|---|---|
| `lib/workflow/types.ts` | Type definitions (`WorkflowExecutionStatus`, `WorkflowStep`, `WorkflowType`, etc.). |
| `lib/workflow/definitions.ts` | Static workflow definitions (`WORKFLOW_DEFINITIONS`), prefix→type inference. |
| `lib/workflow/derive.ts` | Pure reducer: stored steps → `WorkflowStep[]`. `currentStep()`, `fullStepList()`. |
| `lib/workflow/store.ts` | Prisma-backed CRUD: `ensureRun()`, `markStepRunning/Completed/Failed`, `completeRun()`, `failRun()`. |
| `lib/workflow/read.ts` | `getWorkflowState()` — queries the `Workflow` table and derives the UI step list. |
| `lib/workflow/{credentialing,license,enrollment,compliance}.ts` | Vercel Workflow functions with `'use workflow'` and `'use step'` directives. |

## Workflow definitions

`definitions.ts` — four workflow types, each a flat list of step names:

| Type | Steps | ID prefix |
|---|---|---|
| `credentialing` | `APPLICATION_RECEIVED → PSV_EDUCATION → PSV_DEA → SANCTIONS_CHECK → COMMITTEE_REVIEW → APPROVED` | `cred_` |
| `license` | `APPLICATION_PREP → SUBMITTED → STATE_REVIEW → ISSUED` | `lic_` |
| `enrollment` | `SUBMITTED → PAYER_ACK → FOLLOW_UP → APPROVED` | `enr_` |
| `compliance` | `CHECK_OIG → CHECK_SAM → CHECK_NPDB → COMPLETED` | `comp_` |

`inferType(workflowId)` reads the prefix; unknown prefixes throw.

## Workflow functions

Each workflow lives in its own file and uses the `'use workflow'` directive:

```ts
// lib/workflow/credentialing.ts
export async function credentialingWorkflow(workflowId: string) {
  "use workflow";
  await ensureRun(workflowId, "credentialing");
  for (const name of WORKFLOW_DEFINITIONS.credentialing) {
    await runCredentialingStep(workflowId, name);
  }
  await completeRun(workflowId);
}

async function runCredentialingStep(workflowId: string, name: string) {
  "use step";
  await markStepRunning(workflowId, name);
  if (Math.random() < 0.1) throw new FatalError("random_denied");
  await markStepCompleted(workflowId, name);
}
```

- `ensureRun()` seeds the `Workflow` row if it doesn't exist.
- Each step writes its status to the `Workflow.steps` JSON array via Prisma.
- `completeRun()` / `failRun()` update the parent entity (`CredentialingCase`, `License`, `PayerEnrollment`) in Postgres.

## Compliance scheduler

Instead of a boot-time `setInterval`, compliance checks are driven by `vercel.json`:

```json
{
  "crons": [
    { "path": "/api/cron/compliance", "schedule": "0 1 * * *" }
  ]
}
```

`GET /api/cron/compliance`:

The route requires `Authorization: Bearer <CRON_SECRET>` (matched against `process.env.CRON_SECRET`) and returns 401 if the header is missing or invalid.

1. Finds providers with at least one `ACTIVE` license and no `REVOKED` licenses.
2. Creates a `ComplianceCheck` row (`source: "SCHEDULED_CHECK"`, `result: "CLEAN"`).
3. Calls `start(complianceWorkflow, [workflowId])` to kick off the workflow.
4. The workflow steps run with a 10% random failure rate per step. On failure, `failRun()` revokes the provider's `ACTIVE` licenses.

## How the UI consumes it

`components/dashboard/workflow-timeline.tsx` takes `steps: WorkflowStep[]` directly:

```tsx
<WorkflowTimeline steps={state.steps} />
```

The data flow:

```
UI page (RSC)
  └─ lib/credentialing.ts listCredentialingCases()
       └─ prisma.provider.findMany(...)
       └─ getWorkflowState(workflowId)      (lib/workflow/read.ts)
            └─ prisma.workflow.findUnique(...)
            └─ fullStepList(steps, type)   (lib/workflow/derive.ts)
```

No mock state, no reconciliation at boot — the database is the source of truth.

## Productionization notes

- The `Workflow` table persists step-level state. `getWorkflowState()` is a pure read + derive.
- The `start()` function from `workflow/api` kicks off Vercel Workflow execution. In local dev, `withWorkflow()` in `next.config.ts` handles discovery and execution.
- Cron is free on Vercel Pro; the `0 1 * * *` schedule runs compliance checks daily at 1am.
