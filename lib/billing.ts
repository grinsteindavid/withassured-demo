import "server-only";

import { prisma } from "@/lib/db";
import { payInvoice, createMeterEvent } from "@/lib/stripe-mock";
import {
  periodRange,
  platformFeeForPlan,
  rollupUsage,
  unitCentsFor,
  type UsageType,
} from "@/lib/billing-formulas";

export async function getCurrentUsage(period: "current" | "previous", orgId: string) {
  const { periodStart, periodEnd } = periodRange(period);
  const [events, subscription] = await Promise.all([
    prisma.usageEvent.findMany({
      where: {
        occurredAt: { gte: periodStart, lte: periodEnd },
        invoiceId: null,
        orgId,
      },
    }),
    (prisma as any).subscription.findUnique({ where: { orgId } }),
  ]);

  return {
    periodStart,
    periodEnd,
    ...rollupUsage({
      platformFeeCents: platformFeeForPlan(subscription?.plan),
      events: events.map((e) => ({ type: e.type, unitCents: e.unitCents })),
    }),
  };
}

export async function listAllInvoices(orgId: string) {
  const dbInvoices = await prisma.invoice.findMany({
    where: { orgId },
  });

  return dbInvoices.sort(
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

export async function recordUsageEvent(
  type: UsageType,
  providerId?: string,
  orgId = "org_1",
) {
  const unitCents = unitCentsFor(type);

  const event = await prisma.usageEvent.create({
    data: {
      orgId,
      type,
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
