import type { HistoryEvent, WorkflowType } from "./types";

// Static workflow definitions — known from the workflow code itself.
// In production, the frontend imports these alongside the workflow definitions.
export const WORKFLOW_DEFINITIONS: Record<WorkflowType, string[]> = {
  credentialing: [
    "APPLICATION_RECEIVED",
    "PSV_EDUCATION",
    "PSV_DEA",
    "SANCTIONS_CHECK",
    "COMMITTEE_REVIEW",
    "APPROVED",
  ],
  license: ["APPLICATION_PREP", "SUBMITTED", "STATE_REVIEW", "ISSUED"],
  enrollment: ["SUBMITTED", "PAYER_ACK", "FOLLOW_UP", "APPROVED"],
};

const PREFIX_TO_TYPE: Record<string, WorkflowType> = {
  cred_: "credentialing",
  lic_: "license",
  enr_: "enrollment",
};

// How many steps are already completed in the seeded scenario, per workflow type.
// (The next step is RUNNING but not yet completed.)
const SEED_PROGRESS: Record<WorkflowType, number> = {
  credentialing: 3,
  license: 2,
  enrollment: 2,
};

const SEED_START_TIME: Record<WorkflowType, string> = {
  credentialing: "2026-04-20T09:00:00Z",
  license: "2026-04-22T08:00:00Z",
  enrollment: "2026-04-23T10:00:00Z",
};

export function inferType(workflowId: string): WorkflowType {
  for (const [prefix, type] of Object.entries(PREFIX_TO_TYPE)) {
    if (workflowId.startsWith(prefix)) return type;
  }
  throw new Error(`Unknown workflow type for id: ${workflowId}`);
}

export type SeedFixture = {
  type: WorkflowType;
  startTime: Date;
  events: HistoryEvent[];
};

export type WorkflowHistoryOpts = {
  status: "RUNNING" | "COMPLETED" | "FAILED";
  completedCount: number;
};

function buildEvents(
  definition: string[],
  status: WorkflowHistoryOpts["status"],
  completedCount: number,
  startTime: Date,
): HistoryEvent[] {
  const events: HistoryEvent[] = [];
  let eventId = 1;
  let cursor = startTime.getTime();
  const tick = (minutes: number) => new Date((cursor += minutes * 60_000));

  events.push({
    eventId: eventId++,
    eventTime: startTime,
    eventType: "WorkflowExecutionStarted",
  });

  // Completed steps
  for (let i = 0; i < completedCount; i++) {
    const stepName = definition[i];
    if (!stepName) break;
    events.push({
      eventId: eventId++,
      eventTime: tick(30),
      eventType: "ActivityTaskScheduled",
      activityType: stepName,
    });
    events.push({
      eventId: eventId++,
      eventTime: tick(1),
      eventType: "ActivityTaskStarted",
      activityType: stepName,
      attempt: 1,
    });
    events.push({
      eventId: eventId++,
      eventTime: tick(60),
      eventType: "ActivityTaskCompleted",
      activityType: stepName,
    });
  }

  // Current / failed step
  if (status === "RUNNING" || status === "FAILED") {
    const currentIndex = completedCount;
    const stepName = definition[currentIndex];
    if (stepName) {
      events.push({
        eventId: eventId++,
        eventTime: tick(30),
        eventType: "ActivityTaskScheduled",
        activityType: stepName,
      });
      events.push({
        eventId: eventId++,
        eventTime: tick(1),
        eventType: "ActivityTaskStarted",
        activityType: stepName,
        attempt: 1,
      });
      if (status === "FAILED") {
        events.push({
          eventId: eventId++,
          eventTime: tick(60),
          eventType: "ActivityTaskFailed",
          activityType: stepName,
          failure: { message: "reconciled" },
        });
      }
    }
  }

  // Terminal event
  if (status === "COMPLETED") {
    events.push({
      eventId: eventId++,
      eventTime: tick(30),
      eventType: "WorkflowExecutionCompleted",
    });
  } else if (status === "FAILED") {
    events.push({
      eventId: eventId++,
      eventTime: tick(30),
      eventType: "WorkflowExecutionFailed",
      failure: { message: "reconciled" },
    });
  }

  return events;
}

// Build the initial event log for a workflow: WorkflowExecutionStarted, then
// {Scheduled, Started, Completed} triplets for each completed step, then
// {Scheduled, Started} for the currently-running step.
export function buildSeedFixture(workflowId: string): SeedFixture {
  const type = inferType(workflowId);
  const startTime = new Date(SEED_START_TIME[type]);
  const definition = WORKFLOW_DEFINITIONS[type];
  const events = buildEvents(definition, "RUNNING", SEED_PROGRESS[type], startTime);
  return { type, startTime, events };
}

export function buildWorkflowHistory(
  workflowId: string,
  opts: WorkflowHistoryOpts,
): SeedFixture {
  const type = inferType(workflowId);
  const startTime = new Date();
  const definition = WORKFLOW_DEFINITIONS[type];
  const events = buildEvents(definition, opts.status, opts.completedCount, startTime);
  return { type, startTime, events };
}
