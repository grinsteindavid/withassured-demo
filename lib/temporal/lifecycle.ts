import { prisma } from "@/lib/db";
import { controls } from "./client";
import { WORKFLOW_DEFINITIONS, inferType } from "./fixtures";

// ─── DB Sync: mock terminal state → PostgreSQL ──────────────────────────────

export function registerDbSync() {
  controls.onComplete = (workflowId) => {
    console.log(`[workflow] ${workflowId} sync → DB updated to COMPLETED/APPROVED/ACTIVE`);
    prisma.credentialingCase
      .updateMany({ where: { workflowId, status: "IN_PROGRESS" }, data: { status: "COMPLETED" } })
      .catch(() => {});
    prisma.payerEnrollment
      .updateMany({ where: { workflowId, status: "PENDING" }, data: { status: "APPROVED" } })
      .catch(() => {});
    prisma.license
      .updateMany({ where: { workflowId, status: "PENDING" }, data: { status: "ACTIVE" } })
      .catch(() => {});
  };

  controls.onFail = (workflowId) => {
    console.log(`[workflow] ${workflowId} sync → DB updated to FAILED/DENIED/REVOKED`);
    prisma.credentialingCase
      .updateMany({ where: { workflowId, status: "IN_PROGRESS" }, data: { status: "FAILED" } })
      .catch(() => {});
    prisma.payerEnrollment
      .updateMany({ where: { workflowId, status: "PENDING" }, data: { status: "DENIED" } })
      .catch(() => {});
    prisma.license
      .updateMany({ where: { workflowId, status: "PENDING" }, data: { status: "REVOKED" } })
      .catch(() => {});
  };
}

// ─── Reconcile: PostgreSQL → mock workflows at startup ──────────────────────

const TERMINAL_STATUSES = ["COMPLETED", "APPROVED", "ACTIVE", "EXPIRED"];
const FAILURE_STATUSES = ["FAILED", "DENIED", "REVOKED"];

function mapToWorkflowStatus(dbStatus: string): "COMPLETED" | "FAILED" | "RUNNING" {
  if (TERMINAL_STATUSES.includes(dbStatus)) return "COMPLETED";
  if (FAILURE_STATUSES.includes(dbStatus)) return "FAILED";
  return "RUNNING";
}

function reconcileWorkflow(workflowId: string, dbStatus: string) {
  const target = mapToWorkflowStatus(dbStatus);
  const definition = WORKFLOW_DEFINITIONS[inferType(workflowId)];

  if (target === "COMPLETED") {
    controls.create(workflowId, { status: "COMPLETED", completedCount: definition.length });
  } else if (target === "FAILED") {
    controls.create(workflowId, { status: "FAILED", completedCount: 0 });
  } else {
    controls.create(workflowId, { status: "RUNNING", completedCount: 0 });
  }
}

export async function reconcileAll() {
  if (process.env.NODE_ENV === "production") return;

  const savedOnComplete = controls.onComplete;
  const savedOnFail = controls.onFail;
  controls.onComplete = null;
  controls.onFail = null;

  try {
    const cases = await prisma.credentialingCase.findMany({
      select: { workflowId: true, status: true },
    });
    const enrollments = await prisma.payerEnrollment.findMany({
      select: { workflowId: true, status: true },
    });
    const licenses = await prisma.license.findMany({
      select: { workflowId: true, status: true },
    });

    const all = [...cases, ...enrollments, ...licenses] as {
      workflowId: string | null;
      status: string;
    }[];

    for (const row of all) {
      if (!row.workflowId) continue;
      reconcileWorkflow(row.workflowId, row.status);
      console.log(
        `[workflow] ${row.workflowId} reconciled to ${mapToWorkflowStatus(row.status)} (DB: ${row.status})`,
      );
    }
  } finally {
    controls.onComplete = savedOnComplete;
    controls.onFail = savedOnFail;
  }
}
