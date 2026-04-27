import { prisma } from "@/lib/db";
import { controls } from "./client";
import { WORKFLOW_DEFINITIONS, inferType } from "./fixtures";
import { recomputeAndUpdateProviderStatus } from "@/lib/providers";

// ─── DB Sync: mock terminal state → PostgreSQL ──────────────────────────────

async function recomputeForWorkflow(workflowId: string) {
  try {
    const [cases, enrollments, licenses] = await Promise.all([
      prisma.credentialingCase.findMany({ where: { workflowId }, select: { providerId: true } }),
      prisma.payerEnrollment.findMany({ where: { workflowId }, select: { providerId: true } }),
      prisma.license.findMany({ where: { workflowId }, select: { providerId: true } }),
    ]);
    const providerIds = new Set([
      ...cases.map((c) => c.providerId),
      ...enrollments.map((e) => e.providerId),
      ...licenses.map((l) => l.providerId),
    ]);
    if (workflowId.startsWith("comp_")) {
      const checkId = workflowId.replace("comp_", "");
      const check = await prisma.complianceCheck.findUnique({ where: { id: checkId } });
      if (check) providerIds.add(check.providerId);
    }
    for (const pid of providerIds) {
      await recomputeAndUpdateProviderStatus(pid);
    }
  } catch {
    // silently ignore
  }
}

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

    // Handle compliance workflow completion - check result and revoke if FLAG
    if (workflowId.startsWith("comp_")) {
      const checkId = workflowId.replace("comp_", "");
      prisma.complianceCheck
        .findUnique({ where: { id: checkId } })
        .then((check) => {
          if (check && check.result === "FLAG") {
            prisma.license
              .updateMany({ where: { providerId: check.providerId, status: "ACTIVE" }, data: { status: "REVOKED" } })
              .catch(() => {});
            console.log(`[compliance] License revoked for provider ${check.providerId} (FLAG result found)`);
          }
        })
        .catch(() => {});
    }

    recomputeForWorkflow(workflowId);
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

    // Handle compliance workflow failure - revoke license and update check result
    if (workflowId.startsWith("comp_")) {
      const checkId = workflowId.replace("comp_", "");
      prisma.complianceCheck
        .findUnique({ where: { id: checkId } })
        .then((check) => {
          if (check) {
            prisma.license
              .updateMany({ where: { providerId: check.providerId, status: "ACTIVE" }, data: { status: "REVOKED" } })
              .catch(() => {});
            prisma.complianceCheck
              .update({ where: { id: checkId }, data: { result: "FLAG" } })
              .catch(() => {});
            console.log(`[compliance] License revoked and check result set to FLAG for provider ${check.providerId}`);
          }
        })
        .catch(() => {});
    }

    recomputeForWorkflow(workflowId);
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

    // Reconcile compliance workflows based on ComplianceCheck results
    const complianceChecks = await prisma.complianceCheck.findMany({
      select: { id: true, result: true },
    });

    for (const check of complianceChecks) {
      const workflowId = `comp_${check.id}`;
      const status = check.result === "CLEAN" ? "COMPLETED" : "FAILED";
      reconcileWorkflow(workflowId, status);
      console.log(
        `[compliance] ${workflowId} reconciled to ${status} (DB: ${check.result})`,
      );
    }

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

// ─── Compliance Scheduler ─────────────────────────────────────────────────────

export function startComplianceScheduler() {
  if (process.env.NODE_ENV === "production") return;

  const interval = setInterval(async () => {
    try {
      // Find providers with ACTIVE licenses and no REVOKED licenses
      const providers = await prisma.provider.findMany({
        where: {
          licenses: {
            some: { status: "ACTIVE" },
            none: { status: "REVOKED" },
          },
        },
        include: {
          licenses: true,
        },
      });

      for (const provider of providers) {
        // Create new ComplianceCheck record and workflow every 30 seconds
        const check = await prisma.complianceCheck.create({
          data: {
            providerId: provider.id,
            source: "SCHEDULED_CHECK",
            result: "CLEAN",
          },
        });

        const workflowId = `comp_${check.id}`;
        controls.create(workflowId, { status: "RUNNING", completedCount: 0 });
        controls.startAuto(workflowId); // Enable auto-play with random failure chance
        console.log(`[compliance] Started workflow ${workflowId} for provider ${provider.id}`);
      }
    } catch (error) {
      console.error("[compliance] Scheduler error:", error);
    }
  }, 60000); // 60 seconds

  console.log("[compliance] Scheduler started (60s interval)");
}
