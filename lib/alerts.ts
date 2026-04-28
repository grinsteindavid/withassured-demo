import "server-only";

import { prisma } from "@/lib/db";

export interface AlertOptions {
  severity?: "INFO" | "ERROR";
  limit?: number;
  offset?: number;
}

export async function getAlerts(orgId: string, options: AlertOptions = {}) {
  const { severity, limit = 50, offset = 0 } = options;

  const where: { orgId: string; severity?: "INFO" | "ERROR" } = { orgId };
  if (severity) {
    where.severity = severity;
  }

  const alerts = await (prisma as any).alert.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });

  return alerts;
}

export async function markAlertAsRead(alertId: string) {
  await (prisma as any).alert.update({
    where: { id: alertId },
    data: { read: true },
  });
}

export async function markAllAlertsAsRead(orgId: string) {
  await (prisma as any).alert.updateMany({
    where: { orgId, read: false },
    data: { read: true },
  });
}

export async function getUnreadCount(orgId: string): Promise<number> {
  const count = await (prisma as any).alert.count({
    where: { orgId, read: false },
  });
  return count;
}
