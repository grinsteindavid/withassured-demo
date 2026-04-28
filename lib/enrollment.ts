import "server-only";

import { prisma } from "@/lib/db";
import { start } from "workflow/api";
import { enrollmentWorkflow } from "@/lib/workflow/enrollment";
import { seedWorkflowRow } from "@/lib/workflow/store";
import type { createPayerEnrollmentSchema } from "@/lib/validators";
import type { z } from "zod";

export async function listPayerEnrollments(orgId: string) {
  return prisma.payerEnrollment.findMany({
    where: { provider: { orgId } },
  });
}

export async function listProviders(orgId: string) {
  return prisma.provider.findMany({
    where: { orgId },
    select: { id: true, name: true },
  });
}

export async function getDashboardMetrics(orgId: string) {
  const [totalProviders, activeCredentials, pendingEnrollments, complianceAlerts, expiredLicenses] = await Promise.all([
    prisma.provider.count({ where: { orgId } }),
    prisma.credentialingCase.count({
      where: {
        provider: { orgId },
        status: "COMPLETED",
      },
    }),
    prisma.payerEnrollment.count({
      where: {
        provider: { orgId },
        status: "PENDING",
      },
    }),
    prisma.complianceCheck.count({
      where: {
        provider: { orgId },
        result: "FLAG",
      },
    }),
    prisma.license.count({
      where: {
        provider: { orgId },
        status: "EXPIRED",
      },
    }),
  ]);

  return { totalProviders, activeCredentials, pendingEnrollments, complianceAlerts, expiredLicenses };
}

export async function createPayerEnrollment(
  data: z.infer<typeof createPayerEnrollmentSchema>,
  orgId: string,
) {
  const provider = await prisma.provider.findFirst({
    where: { id: data.providerId, orgId },
  });
  if (!provider) {
    throw new Error("Provider not found");
  }

  const enrollment = await prisma.payerEnrollment.create({
    data: {
      providerId: data.providerId,
      payer: data.payer,
      state: data.state,
      status: "PENDING",
      submittedAt: data.submittedAt ? new Date(data.submittedAt) : null,
    },
  });

  const workflowId = `enr_${enrollment.id}`;
  await prisma.payerEnrollment.update({
    where: { id: enrollment.id },
    data: { workflowId },
  });

  // Pre-seed Workflow row before start() so the dashboard can read it
  // immediately, even before the SDK drains its execution queue.
  await seedWorkflowRow(prisma, workflowId, "enrollment");

  await start(enrollmentWorkflow, [workflowId]);

  return prisma.payerEnrollment.findUnique({ where: { id: enrollment.id } });
}
