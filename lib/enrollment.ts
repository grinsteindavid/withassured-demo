import { prisma } from "@/lib/db";

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
  const [totalProviders, activeCredentials, pendingEnrollments, complianceAlerts] = await Promise.all([
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
  ]);

  return { totalProviders, activeCredentials, pendingEnrollments, complianceAlerts };
}
