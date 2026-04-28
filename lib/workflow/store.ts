import "server-only";

import { prisma } from "@/lib/db";
import { WORKFLOW_DEFINITIONS, inferType } from "./definitions";
import type { WorkflowStep, WorkflowType } from "./types";

export type WorkflowRow = Awaited<
  ReturnType<typeof prisma.workflow.findUnique>
>;

// Minimal structural type for the prisma.workflow delegate so this helper
// works with both the top-level prisma client and a $transaction tx client.
type WorkflowUpsertCapable = {
  workflow: {
    upsert: (args: {
      where: { id: string };
      update: Record<string, never>;
      create: { id: string; type: string; status: string; steps: WorkflowStep[] };
    }) => Promise<unknown>;
  };
};

function seedSteps(type: string): WorkflowStep[] {
  const definition = WORKFLOW_DEFINITIONS[type as keyof typeof WORKFLOW_DEFINITIONS];
  if (!definition) return [];
  return definition.map((name) => ({ name, status: "PENDING" as const }));
}

// Idempotently create a Workflow row with status=RUNNING and seeded PENDING
// steps. Call this at every site that invokes start() so the UI never sees a
// missing row during the SDK queue-drain window. Safe to call inside a
// $transaction by passing the tx client.
export async function seedWorkflowRow(
  client: WorkflowUpsertCapable,
  id: string,
  type: WorkflowType,
) {
  await client.workflow.upsert({
    where: { id },
    update: {},
    create: {
      id,
      type,
      status: "RUNNING",
      steps: seedSteps(type),
    },
  });
}

export async function ensureRun(id: string, type?: string) {
  const t = type ?? inferType(id);
  const existing = await prisma.workflow.findUnique({ where: { id } });
  if (existing) return existing;

  return prisma.workflow.create({
    data: {
      id,
      type: t,
      status: "RUNNING",
      steps: seedSteps(t),
    },
  });
}

function stepsFromRow(row: { steps: unknown }): WorkflowStep[] {
  const arr = Array.isArray(row.steps) ? (row.steps as WorkflowStep[]) : [];
  return arr.map((s) => ({
    name: String(s.name),
    status: s.status as WorkflowStep["status"],
    at: s.at,
    attempt: s.attempt,
  }));
}

function updateStep(steps: WorkflowStep[], name: string, patch: Partial<WorkflowStep>): WorkflowStep[] {
  const next = steps.map((s) =>
    s.name === name ? { ...s, ...patch } : s,
  );
  if (!next.some((s) => s.name === name)) {
    next.push({ name, status: "PENDING", ...patch });
  }
  return next;
}

async function setStep(id: string, name: string, patch: Partial<WorkflowStep>) {
  const row = await prisma.workflow.findUnique({ where: { id } });
  if (!row) throw new Error(`Workflow ${id} not found`);
  const steps = updateStep(stepsFromRow(row), name, patch);
  await prisma.workflow.update({ where: { id }, data: { steps } });
}

export async function markStepRunning(id: string, name: string) {
  await setStep(id, name, { status: "RUNNING", at: new Date().toISOString() });
}

export async function markStepCompleted(id: string, name: string) {
  await setStep(id, name, { status: "COMPLETED", at: new Date().toISOString() });
}

export async function markStepFailed(id: string, name: string) {
  await setStep(id, name, { status: "FAILED", at: new Date().toISOString() });
}

export async function completeRun(id: string) {
  await prisma.workflow.update({
    where: { id },
    data: { status: "COMPLETED", closedAt: new Date() },
  });

  await Promise.all([
    prisma.credentialingCase
      .updateMany({ where: { workflowId: id, status: "IN_PROGRESS" }, data: { status: "COMPLETED" } })
      .catch(() => {}),
    prisma.payerEnrollment
      .updateMany({ where: { workflowId: id, status: "PENDING" }, data: { status: "APPROVED" } })
      .catch(() => {}),
    prisma.license
      .updateMany({ where: { workflowId: id }, data: { status: "ACTIVE" } })
      .catch(() => {}),
  ]);
}

export async function failRun(id: string) {
  await prisma.workflow.update({
    where: { id },
    data: { status: "FAILED", closedAt: new Date() },
  });

  await Promise.all([
    prisma.credentialingCase
      .updateMany({ where: { workflowId: id, status: "IN_PROGRESS" }, data: { status: "FAILED" } })
      .catch(() => {}),
    prisma.payerEnrollment
      .updateMany({ where: { workflowId: id, status: "PENDING" }, data: { status: "DENIED" } })
      .catch(() => {}),
    prisma.license
      .updateMany({ where: { workflowId: id }, data: { status: "REVOKED" } })
      .catch(() => {}),
  ]);

  if (id.startsWith("comp_")) {
    const checkId = id.replace("comp_", "");
    const check = await prisma.complianceCheck.findUnique({ where: { id: checkId } }).catch(() => null);
    if (check) {
      await prisma.license
        .updateMany({ where: { providerId: check.providerId, status: "ACTIVE" }, data: { status: "REVOKED" } })
        .catch(() => {});
      await prisma.complianceCheck
        .update({ where: { id: checkId }, data: { result: "FLAG" } })
        .catch(() => {});
    }
  }
}

export async function recomputeForWorkflow(workflowId: string) {
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
    const { recomputeAndUpdateProviderStatus } = await import("@/lib/providers");
    for (const pid of providerIds) {
      await recomputeAndUpdateProviderStatus(pid);
    }
  } catch {
    // silently ignore
  }
}
