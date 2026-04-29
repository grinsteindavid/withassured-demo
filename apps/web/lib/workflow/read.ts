import "server-only";

import { prisma } from "@/lib/db";
import type { WorkflowStep } from "./types";
import { inferType } from "./definitions";
import { currentStep, fullStepList } from "./derive";

function stepsFromRow(steps: unknown): WorkflowStep[] {
  const arr = Array.isArray(steps) ? (steps as WorkflowStep[]) : [];
  return arr.map((s) => ({
    name: String(s.name),
    status: s.status as WorkflowStep["status"],
    at: s.at,
    attempt: s.attempt,
  }));
}

export async function getWorkflowState(workflowId: string) {
  const row = await prisma.workflow.findUnique({ where: { id: workflowId } });
  if (!row) {
    throw new Error(`Workflow not found: ${workflowId}`);
  }

  const steps = stepsFromRow(row.steps);
  const type = inferType(workflowId);

  return {
    workflowId: row.id,
    runId: row.runId ?? `run_${row.id}`,
    type,
    status: row.status,
    currentStep: currentStep(steps),
    steps: fullStepList(steps, type),
    startTime: row.startedAt,
    closeTime: row.closedAt ?? undefined,
  };
}
