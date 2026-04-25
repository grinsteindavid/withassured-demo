import type { HistoryEvent, WorkflowStep, WorkflowType } from "./types";
import { WORKFLOW_DEFINITIONS } from "./fixtures";

// Walks Temporal history events and folds them into a step model the UI can render.
// This is the function you'd write against real Temporal too; the mock changes, this doesn't.
export function historyToSteps(events: HistoryEvent[]): WorkflowStep[] {
  const byActivity = new Map<string, WorkflowStep>();
  const order: string[] = [];

  for (const event of events) {
    const name = event.activityType;
    if (!name) continue;

    if (!byActivity.has(name)) {
      byActivity.set(name, { name, status: "PENDING" });
      order.push(name);
    }
    const step = byActivity.get(name)!;

    switch (event.eventType) {
      case "ActivityTaskScheduled":
        step.status = "PENDING";
        break;
      case "ActivityTaskStarted":
        step.status = "RUNNING";
        if (event.attempt !== undefined) step.attempt = event.attempt;
        break;
      case "ActivityTaskCompleted":
        step.status = "COMPLETED";
        step.at = event.eventTime.toISOString();
        break;
      case "ActivityTaskFailed":
        step.status = "FAILED";
        step.at = event.eventTime.toISOString();
        break;
    }
  }

  return order.map((name) => byActivity.get(name)!);
}

// Returns the name of the latest non-completed step, or null if everything finished.
export function currentStep(events: HistoryEvent[]): string | null {
  const steps = historyToSteps(events);
  const active = steps.find((s) => s.status === "RUNNING" || s.status === "FAILED");
  if (active) return active.name;
  const lastPending = [...steps].reverse().find((s) => s.status === "PENDING");
  return lastPending?.name ?? null;
}

// Combines derived steps with the static workflow definition to surface
// not-yet-scheduled steps as PENDING (Temporal's history alone doesn't include them).
export function fullStepList(events: HistoryEvent[], type: WorkflowType): WorkflowStep[] {
  const derived = historyToSteps(events);
  const definition = WORKFLOW_DEFINITIONS[type];
  const seen = new Set(derived.map((s) => s.name));
  const future = definition
    .filter((name) => !seen.has(name))
    .map<WorkflowStep>((name) => ({ name, status: "PENDING" }));
  return [...derived, ...future];
}
