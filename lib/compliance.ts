import { prisma } from "@/lib/db";

export async function getComplianceChecks(orgId: string, providerId?: string) {
  const where: { providerId?: string; provider: { orgId: string } } = { provider: { orgId } };
  if (providerId) where.providerId = providerId;
  return prisma.complianceCheck.findMany({ where });
}
