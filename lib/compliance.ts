import { prisma } from "@/lib/db";

export async function getComplianceChecks(providerId?: string) {
  const where = providerId ? { providerId } : {};
  return prisma.complianceCheck.findMany({ where });
}
