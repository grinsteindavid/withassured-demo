// Pure billing math: rollups, period boundaries, type guards, and the
// per-unit pricing table. No Prisma / DB access — safe for client and server.

import { SUBSCRIPTION_PRICING } from "@/lib/subscription-plans";

export const PRICING = {
  unitPriceCredentialing: 19_900,
  unitPriceLicense: 9_900,
  unitPriceEnrollment: 14_900,
  unitPriceMonitoring: 2_900,
} as const;

export const VALID_USAGE_TYPES = [
  "CREDENTIALING",
  "LICENSE",
  "ENROLLMENT",
  "MONITORING",
] as const;

export type UsageType = (typeof VALID_USAGE_TYPES)[number];

export function isValidUsageType(type: string): type is UsageType {
  return VALID_USAGE_TYPES.includes(type as UsageType);
}

export function unitCentsFor(type: UsageType): number {
  switch (type) {
    case "CREDENTIALING":
      return PRICING.unitPriceCredentialing;
    case "LICENSE":
      return PRICING.unitPriceLicense;
    case "ENROLLMENT":
      return PRICING.unitPriceEnrollment;
    case "MONITORING":
      return PRICING.unitPriceMonitoring;
  }
}

export function platformFeeForPlan(plan: string | null | undefined): number {
  if (!plan) return 0;
  const entry = SUBSCRIPTION_PRICING[plan as keyof typeof SUBSCRIPTION_PRICING];
  return entry?.platformFeeCents ?? 0;
}

export function periodRange(
  period: "current" | "previous",
  now: Date = new Date(),
) {
  const offset = period === "current" ? 0 : -1;
  const periodStart = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
  return { periodStart, periodEnd };
}

export function rollupUsage(params: {
  platformFeeCents: number;
  events: Array<{ type: string; unitCents: number }>;
}) {
  const { platformFeeCents, events } = params;
  const lines = new Map<
    string,
    { count: number; unitCents: number; subtotalCents: number }
  >();

  for (const event of events) {
    const existing =
      lines.get(event.type) || {
        count: 0,
        unitCents: event.unitCents,
        subtotalCents: 0,
      };
    lines.set(event.type, {
      count: existing.count + 1,
      unitCents: event.unitCents,
      subtotalCents: existing.subtotalCents + event.unitCents,
    });
  }

  const subtotalCents = Array.from(lines.values()).reduce(
    (sum, line) => sum + line.subtotalCents,
    0,
  );
  const totalCents = subtotalCents + platformFeeCents;

  return {
    platformFeeCents,
    lines: Array.from(lines.entries()).map(([type, data]) => ({
      type,
      count: data.count,
      unitCents: data.unitCents,
      subtotalCents: data.subtotalCents,
    })),
    subtotalCents,
    totalCents,
  };
}
