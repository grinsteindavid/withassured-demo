import { prisma } from "@/lib/db";
import { listInvoices } from "@/lib/stripe-mock";

export const PRICING = {
  platformFeeCents: 150_000,
  unitPriceCredentialing: 19_900,
  unitPriceLicense: 9_900,
  unitPriceEnrollment: 14_900,
  unitPriceMonitoring: 2_900,
} as const;

export function rollupUsage(params: {
  platformFeeCents: number;
  events: Array<{ type: string; unitCents: number }>;
}) {
  const { platformFeeCents, events } = params;
  const lines = new Map<string, { count: number; unitCents: number; subtotalCents: number }>();

  for (const event of events) {
    const existing = lines.get(event.type) || { count: 0, unitCents: event.unitCents, subtotalCents: 0 };
    lines.set(event.type, {
      count: existing.count + 1,
      unitCents: event.unitCents,
      subtotalCents: existing.subtotalCents + event.unitCents,
    });
  }

  const subtotalCents = Array.from(lines.values()).reduce((sum, line) => sum + line.subtotalCents, 0);
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

export function periodRange(period: "current" | "previous", now: Date = new Date()) {
  const offset = period === "current" ? 0 : -1;
  const periodStart = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
  return { periodStart, periodEnd };
}

export async function getCurrentUsage(period: "current" | "previous") {
  const { periodStart, periodEnd } = periodRange(period);
  const events = await prisma.usageEvent.findMany({
    where: {
      occurredAt: { gte: periodStart, lte: periodEnd },
      invoiceId: null,
    },
  });
  return {
    periodStart,
    periodEnd,
    ...rollupUsage({
      platformFeeCents: PRICING.platformFeeCents,
      events: events.map((e) => ({ type: e.type, unitCents: e.unitCents })),
    }),
  };
}

export async function listAllInvoices(orgId = "org_1") {
  const dbInvoices = await prisma.invoice.findMany();
  const mockInvoices = listInvoices(orgId).map((inv) => ({
    id: inv.id,
    orgId: inv.customer,
    periodStart: new Date(inv.created_at),
    periodEnd: new Date(inv.created_at),
    subtotalCents: inv.amount_due,
    totalCents: inv.amount_due,
    status: inv.status.toUpperCase() as "OPEN" | "PAID" | "VOID",
    lineItems: inv.lines,
  }));

  return [...dbInvoices, ...mockInvoices].sort(
    (a, b) => new Date(b.periodStart).getTime() - new Date(a.periodStart).getTime(),
  );
}
