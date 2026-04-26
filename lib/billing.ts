import { prisma } from "@/lib/db";
import { listInvoices, payInvoice, createMeterEvent } from "@/lib/stripe-mock";

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

export async function getCurrentUsage(period: "current" | "previous", orgId: string) {
  const { periodStart, periodEnd } = periodRange(period);
  const events = await prisma.usageEvent.findMany({
    where: {
      occurredAt: { gte: periodStart, lte: periodEnd },
      invoiceId: null,
      orgId,
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

export async function listAllInvoices(orgId: string) {
  const dbInvoices = await prisma.invoice.findMany({
    where: { orgId },
  });
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

export async function getInvoiceById(id: string, orgId: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { events: true },
  });
  if (!invoice || invoice.orgId !== orgId) {
    return null;
  }
  return invoice;
}

const VALID_TYPES = ["CREDENTIALING", "LICENSE", "ENROLLMENT", "MONITORING"] as const;

export function isValidUsageType(type: string): type is (typeof VALID_TYPES)[number] {
  return VALID_TYPES.includes(type as (typeof VALID_TYPES)[number]);
}

export async function recordUsageEvent(
  type: (typeof VALID_TYPES)[number],
  providerId?: string,
  orgId = "org_1",
) {
  const unitCentsMap: Record<string, number> = {
    CREDENTIALING: PRICING.unitPriceCredentialing,
    LICENSE: PRICING.unitPriceLicense,
    ENROLLMENT: PRICING.unitPriceEnrollment,
    MONITORING: PRICING.unitPriceMonitoring,
  };
  const unitCents = unitCentsMap[type] || 0;

  const event = await prisma.usageEvent.create({
    data: {
      orgId,
      type: type as "CREDENTIALING" | "LICENSE" | "ENROLLMENT" | "MONITORING",
      providerId,
      unitCents,
    },
  });

  createMeterEvent({
    event_name: type.toLowerCase(),
    customer: orgId,
    value: 1,
  });

  return event;
}

export async function processInvoicePayment(id: string, paymentMethodId?: string) {
  const mockResult = payInvoice(id);
  if (mockResult) {
    await prisma.invoice.updateMany({
      where: { id },
      data: { status: "PAID" },
    });
    return { success: true, paymentIntentId: mockResult.paymentIntentId };
  }

  const dbInvoice = await prisma.invoice.findUnique({ where: { id } });
  if (!dbInvoice) return { success: false, error: "Invoice not found" };
  if (dbInvoice.status === "PAID") return { success: false, error: "Already paid" };

  await prisma.invoice.update({
    where: { id },
    data: { status: "PAID" },
  });

  return { success: true, paymentIntentId: `pi_${id}` };
}
