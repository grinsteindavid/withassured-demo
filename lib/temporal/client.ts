import type {
  HistoryEvent,
  WorkflowExecutionDescription,
  WorkflowExecutionStatus,
  WorkflowHistory,
  WorkflowType,
} from "./types";
import { WORKFLOW_DEFINITIONS, buildSeedFixture, buildWorkflowHistory } from "./fixtures";

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
  timers: Map<string, NodeJS.Timeout>;
  autoPlayEnabled: boolean;
};

// Singleton — same globalThis trick as lib/db.ts so state survives Next.js dev hot-reload.
const globalForTemporal = globalThis as unknown as {
  temporalState?: TemporalState;
};

const state: TemporalState = globalForTemporal.temporalState ?? {
  workflows: new Map(),
  timers: new Map(),
  autoPlayEnabled: false,
};

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
  if (process.env.NODE_ENV !== "production") {
    console.log(`[workflow] ${workflowId} seeded (${workflow.type})`);
  }
  if (state.autoPlayEnabled) {
    scheduleAutoTick(workflowId);
  }
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
function scheduleAutoTick(workflowId: string): void {
  if (state.timers.has(workflowId)) return;
  const delay = 3000 + Math.random() * 5000; // 3–8 s
  if (process.env.NODE_ENV !== "production") {
    console.log(`[workflow] ${workflowId} tick scheduled in ${Math.round(delay)}ms`);
  }
  const timer = setTimeout(() => {
    state.timers.delete(workflowId);
    const workflow = state.workflows.get(workflowId);
    if (!workflow || workflow.status !== "RUNNING") return;

    if (Math.random() < 0.1) {
      controls.fail(workflowId, "random_denied");
    } else {
      controls.advance(workflowId);
    }

    // Schedule next tick if still running after this step
    if (workflow.status === "RUNNING") {
      scheduleAutoTick(workflowId);
    }
  }, delay);
  state.timers.set(workflowId, timer);
}

function cancelAutoTick(workflowId: string): void {
  const timer = state.timers.get(workflowId);
  if (timer) {
    clearTimeout(timer);
    state.timers.delete(workflowId);
  }
}

export const controls = {
  onComplete: null as ((workflowId: string) => void) | null,
  onFail: null as ((workflowId: string, reason: string) => void) | null,

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
      if (process.env.NODE_ENV !== "production") {
        console.log(`[workflow] ${workflowId} advance ${running} → ${nextStep}`);
      }
    } else {
      workflow.events.push({
        eventId: nextEventId(workflow),
        eventTime: now,
        eventType: "WorkflowExecutionCompleted",
      });
      workflow.status = "COMPLETED";
      workflow.closeTime = now;
      if (process.env.NODE_ENV !== "production") {
        console.log(`[workflow] ${workflowId} completed`);
      }
      controls.onComplete?.(workflowId);
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
    if (process.env.NODE_ENV !== "production") {
      console.log(`[workflow] ${workflowId} failed: ${reason}`);
    }
    controls.onFail?.(workflowId, reason);
  },

  startAuto(workflowId: string): void {
    scheduleAutoTick(workflowId);
  },

  stopAuto(workflowId: string): void {
    cancelAutoTick(workflowId);
  },

  enableAutoPlay(): void {
    if (state.autoPlayEnabled) return;
    state.autoPlayEnabled = true;
    for (const [workflowId, workflow] of state.workflows) {
      if (workflow.status === "RUNNING" && !state.timers.has(workflowId)) {
        scheduleAutoTick(workflowId);
      }
    }
  },

  disableAutoPlay(): void {
    state.autoPlayEnabled = false;
    for (const workflowId of state.timers.keys()) {
      cancelAutoTick(workflowId);
    }
  },

  create(
    workflowId: string,
    opts: { status: "RUNNING" | "COMPLETED" | "FAILED"; completedCount: number },
  ): MockWorkflow {
    const existing = state.workflows.get(workflowId);
    if (existing) return existing;
    const history = buildWorkflowHistory(workflowId, opts);
    const workflow: MockWorkflow = {
      workflowId,
      runId: `run_${workflowId}_${Date.now()}`,
      type: history.type,
      status: opts.status,
      startTime: history.startTime,
      events: history.events,
    };
    const lastEvent = history.events[history.events.length - 1];
    if ((opts.status === "COMPLETED" || opts.status === "FAILED") && lastEvent) {
      workflow.closeTime = lastEvent.eventTime;
    }
    state.workflows.set(workflowId, workflow);
    if (process.env.NODE_ENV !== "production") {
      console.log(`[workflow] ${workflowId} created (${workflow.type} → ${opts.status})`);
    }
    if (opts.status === "RUNNING" && state.autoPlayEnabled) {
      scheduleAutoTick(workflowId);
    }
    return workflow;
  },

  reset(): void {
    for (const timer of state.timers.values()) {
      clearTimeout(timer);
    }
    state.timers.clear();
    state.workflows.clear();
    state.autoPlayEnabled = false;
  },
};

// Enable auto-play by default in dev/test so workflows feel alive.
if (process.env.NODE_ENV !== "production") {
  controls.enableAutoPlay();
}
