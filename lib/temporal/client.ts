import type {
  HistoryEvent,
  WorkflowExecutionDescription,
  WorkflowExecutionStatus,
  WorkflowHistory,
  WorkflowType,
} from "./types";
import { WORKFLOW_DEFINITIONS, buildSeedFixture } from "./fixtures";

type MockWorkflow = {
  workflowId: string;
  runId: string;
  type: WorkflowType;
  status: WorkflowExecutionStatus;
  startTime: Date;
  closeTime?: Date;
  events: HistoryEvent[];
};

type TemporalState = {
  workflows: Map<string, MockWorkflow>;
};

// Singleton — same globalThis trick as lib/db.ts so state survives Next.js dev hot-reload.
const globalForTemporal = globalThis as unknown as { temporalState?: TemporalState };

const state: TemporalState = globalForTemporal.temporalState ?? { workflows: new Map() };

if (process.env.NODE_ENV !== "production") globalForTemporal.temporalState = state;

function ensure(workflowId: string): MockWorkflow {
  const existing = state.workflows.get(workflowId);
  if (existing) return existing;
  const seed = buildSeedFixture(workflowId);
  const workflow: MockWorkflow = {
    workflowId,
    runId: `run_${workflowId}_${Date.now()}`,
    type: seed.type,
    status: "RUNNING",
    startTime: seed.startTime,
    events: seed.events,
  };
  state.workflows.set(workflowId, workflow);
  return workflow;
}

function nextEventId(workflow: MockWorkflow): number {
  return workflow.events.length + 1;
}

function findRunningActivity(workflow: MockWorkflow): string | null {
  for (let i = workflow.events.length - 1; i >= 0; i--) {
    const event = workflow.events[i];
    if (event.eventType === "ActivityTaskStarted") return event.activityType ?? null;
    if (event.eventType === "ActivityTaskCompleted" || event.eventType === "ActivityTaskFailed") return null;
  }
  return null;
}

class MockWorkflowHandle {
  constructor(public readonly workflowId: string) {}

  async describe(): Promise<WorkflowExecutionDescription> {
    const workflow = ensure(this.workflowId);
    return {
      workflowId: workflow.workflowId,
      runId: workflow.runId,
      type: workflow.type,
      status: { name: workflow.status },
      startTime: workflow.startTime,
      closeTime: workflow.closeTime,
      historyLength: workflow.events.length,
      taskQueue: `${workflow.type}-tq`,
    };
  }

  async fetchHistory(): Promise<WorkflowHistory> {
    const workflow = ensure(this.workflowId);
    return { events: [...workflow.events] };
  }
}

export const mockTemporal = {
  workflow: {
    getHandle: (workflowId: string) => new MockWorkflowHandle(workflowId),
  },
};

// Dev-only imperative controls — NOT part of the @temporalio/client surface.
// Real Temporal advances workflows via worker activity completion; here we cheat.
export const controls = {
  advance(workflowId: string): void {
    const workflow = ensure(workflowId);
    if (workflow.status !== "RUNNING") return;

    const running = findRunningActivity(workflow);
    if (!running) return;

    const now = new Date();
    workflow.events.push({
      eventId: nextEventId(workflow),
      eventTime: now,
      eventType: "ActivityTaskCompleted",
      activityType: running,
    });

    const definition = WORKFLOW_DEFINITIONS[workflow.type];
    const currentIndex = definition.indexOf(running);
    const nextStep = definition[currentIndex + 1];

    if (nextStep) {
      workflow.events.push({
        eventId: nextEventId(workflow),
        eventTime: now,
        eventType: "ActivityTaskScheduled",
        activityType: nextStep,
      });
      workflow.events.push({
        eventId: nextEventId(workflow),
        eventTime: now,
        eventType: "ActivityTaskStarted",
        activityType: nextStep,
        attempt: 1,
      });
    } else {
      workflow.events.push({
        eventId: nextEventId(workflow),
        eventTime: now,
        eventType: "WorkflowExecutionCompleted",
      });
      workflow.status = "COMPLETED";
      workflow.closeTime = now;
    }
  },

  fail(workflowId: string, reason: string): void {
    const workflow = ensure(workflowId);
    if (workflow.status !== "RUNNING") return;

    const running = findRunningActivity(workflow);
    const now = new Date();

    if (running) {
      workflow.events.push({
        eventId: nextEventId(workflow),
        eventTime: now,
        eventType: "ActivityTaskFailed",
        activityType: running,
        failure: { message: reason },
      });
    }
    workflow.events.push({
      eventId: nextEventId(workflow),
      eventTime: now,
      eventType: "WorkflowExecutionFailed",
      failure: { message: reason },
    });
    workflow.status = "FAILED";
    workflow.closeTime = now;
  },

  reset(): void {
    state.workflows.clear();
  },
};
