import { FatalError } from "workflow";
import {
  ensureRun,
  completeRun,
  failRun,
  markStepRunning,
  markStepCompleted,
  createAlert,
} from "./store";
import type { WorkflowType } from "./types";

// Step-function wrappers around Prisma-touching store helpers so that
// workflow bodies (which run in a sandboxed environment without Node.js
// modules) can drive run lifecycle without importing @prisma/client into
// the workflow bundle.

export async function ensureRunStep(workflowId: string, type: WorkflowType) {
  "use step";
  await ensureRun(workflowId, type);
}

export async function completeRunStep(workflowId: string) {
  "use step";
  await completeRun(workflowId);
  const workflowType = workflowId.startsWith("cred_")
    ? "Credentialing"
    : workflowId.startsWith("lic_")
    ? "Licensing"
    : workflowId.startsWith("enr_")
    ? "Enrollment"
    : "Compliance";
  await createAlert(
    workflowId,
    "WORKFLOW_COMPLETED",
    "INFO",
    `${workflowType} workflow completed`,
    `The ${workflowType.toLowerCase()} workflow has completed successfully.`,
  );
}

export async function failRunStep(workflowId: string) {
  "use step";
  await failRun(workflowId);
  const workflowType = workflowId.startsWith("cred_")
    ? "Credentialing"
    : workflowId.startsWith("lic_")
    ? "Licensing"
    : workflowId.startsWith("enr_")
    ? "Enrollment"
    : "Compliance";
  await createAlert(
    workflowId,
    "WORKFLOW_FAILED",
    "ERROR",
    `${workflowType} workflow failed`,
    `The ${workflowType.toLowerCase()} workflow has failed - please review the workflow details.`,
  );
}

// Execute a single workflow step: mark it RUNNING, simulate 3–8s of work,
// roll a 10% fatal failure, then mark COMPLETED. Shared across all four
// workflow types so the timing/failure logic lives in one place.
export async function runStep(workflowId: string, name: string) {
  "use step";
  await markStepRunning(workflowId, name);
  const ms = 3000 + Math.floor(Math.random() * 5001); // 3000–8000 inclusive
  await new Promise((resolve) => setTimeout(resolve, ms));
  if (Math.random() < 0.1) throw new FatalError("random_denied");
  await markStepCompleted(workflowId, name);
}
