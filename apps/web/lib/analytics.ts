import { prisma } from "@/lib/db";

export interface TimeToRevenueDataPoint {
  month: string;
  completed: number;
  baseline: number;
}

export interface WorkflowSuccessData {
  workflowType: string;
  completed: number;
  failed: number;
  inProgress: number;
}

export interface LicenseExpirationData {
  bucket: string;
  count: number;
}

export interface UsageCostDataPoint {
  month: string;
  credentialing: number;
  licensing: number;
  enrollment: number;
  monitoring: number;
}

export async function getTimeToRevenueData(orgId: string, days: number): Promise<TimeToRevenueDataPoint[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const completedCases = await prisma.credentialingCase.findMany({
    where: {
      provider: { orgId },
      status: "COMPLETED",
      updatedAt: { gte: startDate },
    },
    select: {
      updatedAt: true,
    },
  });

  // Group by month
  const monthlyData = new Map<string, number>();
  completedCases.forEach((c) => {
    const month = c.updatedAt.toISOString().slice(0, 7); // YYYY-MM
    monthlyData.set(month, (monthlyData.get(month) || 0) + 1);
  });

  // Fill in all months in range
  const result: TimeToRevenueDataPoint[] = [];
  const current = new Date(startDate);
  while (current <= new Date()) {
    const month = current.toISOString().slice(0, 7);
    result.push({
      month,
      completed: monthlyData.get(month) || 0,
      baseline: 0, // Will be calculated in chart as industry baseline
    });
    current.setMonth(current.getMonth() + 1);
  }

  return result;
}

export async function getWorkflowSuccessRates(orgId: string): Promise<WorkflowSuccessData[]> {
  const [credentialing, licenses, enrollments, compliance] = await Promise.all([
    prisma.credentialingCase.groupBy({
      by: ["status"],
      where: { provider: { orgId } },
      _count: true,
    }),
    prisma.license.groupBy({
      by: ["status"],
      where: { provider: { orgId } },
      _count: true,
    }),
    prisma.payerEnrollment.groupBy({
      by: ["status"],
      where: { provider: { orgId } },
      _count: true,
    }),
    prisma.complianceCheck.groupBy({
      by: ["result"],
      where: { provider: { orgId } },
      _count: true,
    }),
  ]);

  const getCount = (items: { status?: string; result?: string; _count: number }[], value: string) =>
    items.find((i) => i.status === value || i.result === value)?._count || 0;

  return [
    {
      workflowType: "Credentialing",
      completed: getCount(credentialing, "COMPLETED"),
      failed: getCount(credentialing, "FAILED"),
      inProgress: getCount(credentialing, "IN_PROGRESS"),
    },
    {
      workflowType: "Licensing",
      completed: getCount(licenses, "ACTIVE"),
      failed: getCount(licenses, "EXPIRED") + getCount(licenses, "REVOKED"),
      inProgress: getCount(licenses, "PENDING"),
    },
    {
      workflowType: "Enrollment",
      completed: getCount(enrollments, "APPROVED"),
      failed: getCount(enrollments, "DENIED"),
      inProgress: getCount(enrollments, "PENDING"),
    },
    {
      workflowType: "Compliance",
      completed: getCount(compliance, "PASS"),
      failed: getCount(compliance, "FLAG"),
      inProgress: 0, // Compliance checks are point-in-time
    },
  ];
}

export async function getLicenseExpirationData(orgId: string): Promise<LicenseExpirationData[]> {
  const now = new Date();
  const buckets = [
    { name: "0-30 days", start: 0, end: 30 },
    { name: "30-60 days", start: 30, end: 60 },
    { name: "60-90 days", start: 60, end: 90 },
    { name: "90-180 days", start: 90, end: 180 },
    { name: "180+ days", start: 180, end: 3650 },
  ];

  const licenses = await prisma.license.findMany({
    where: {
      provider: { orgId },
      status: { in: ["ACTIVE", "PENDING"] },
      expiresAt: { gte: now },
    },
    select: {
      expiresAt: true,
    },
  });

  const result: LicenseExpirationData[] = buckets.map((bucket) => {
    const count = licenses.filter((l) => {
      const daysUntilExpiry = Math.floor((l.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntilExpiry >= bucket.start && daysUntilExpiry < bucket.end;
    }).length;

    return {
      bucket: bucket.name,
      count,
    };
  });

  return result;
}

export async function getUsageCostData(orgId: string, days: number): Promise<UsageCostDataPoint[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const billingPlan = await prisma.billingPlan.findUnique({
    where: { orgId },
  });

  if (!billingPlan) {
    return [];
  }

  const usageEvents = await prisma.usageEvent.findMany({
    where: {
      orgId,
      occurredAt: { gte: startDate },
    },
    select: {
      type: true,
      occurredAt: true,
    },
  });

  // Count events by month and type
  const monthlyData = new Map<string, Map<string, number>>();
  usageEvents.forEach((e) => {
    const month = e.occurredAt.toISOString().slice(0, 7);
    if (!monthlyData.has(month)) {
      monthlyData.set(month, new Map());
    }
    const typeMap = monthlyData.get(month)!;
    typeMap.set(e.type, (typeMap.get(e.type) || 0) + 1);
  });

  // Fill in all months in range with costs
  const result: UsageCostDataPoint[] = [];
  const current = new Date(startDate);
  while (current <= new Date()) {
    const month = current.toISOString().slice(0, 7);
    const typeMap = monthlyData.get(month) || new Map();
    result.push({
      month,
      credentialing: (typeMap.get("CREDENTIALING") || 0) * billingPlan.unitPriceCredentialing,
      licensing: (typeMap.get("LICENSE") || 0) * billingPlan.unitPriceLicense,
      enrollment: (typeMap.get("ENROLLMENT") || 0) * billingPlan.unitPriceEnrollment,
      monitoring: (typeMap.get("MONITORING") || 0) * billingPlan.unitPriceMonitoring,
    });
    current.setMonth(current.getMonth() + 1);
  }

  return result;
}

