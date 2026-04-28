import type { WorkflowStep, WorkflowType } from "./types";
import { WORKFLOW_DEFINITIONS } from "./definitions";

// Returns the name of the latest non-completed step, or null if everything finished.
export function currentStep(steps: WorkflowStep[]): string | null {
  const active = steps.find((s) => s.status === "RUNNING" || s.status === "FAILED");
  if (active) return active.name;
  const lastPending = [...steps].reverse().find((s) => s.status === "PENDING");
  return lastPending?.name ?? null;
}

// Combines stored steps with the static workflow definition to surface
// not-yet-scheduled steps as PENDING.
export function fullStepList(steps: WorkflowStep[], type: WorkflowType): WorkflowStep[] {
  const definition = WORKFLOW_DEFINITIONS[type];
  const seen = new Set(steps.map((s) => s.name));
  const future = definition
    .filter((name) => !seen.has(name))
    .map<WorkflowStep>((name) => ({ name, status: "PENDING" }));
  return [...steps, ...future];
}
