import { prisma } from "@/lib/db";

export async function getLicenses(expiringInDays?: number) {
  const where = expiringInDays
    ? {
        expiresAt: {
          lte: new Date(Date.now() + expiringInDays * 24 * 60 * 60 * 1000),
        },
      }
    : {};

  return prisma.license.findMany({ where });
}
