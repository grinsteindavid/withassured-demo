import { describe, it, expect, mock, beforeEach } from "bun:test";
import { createInvoice, resetMockState, getSubscriptionItems } from "@/lib/stripe-mock";

const usageFindMany = mock(async (_args: { where: Record<string, unknown> }) => [
  { type: "CREDENTIALING", unitCents: 19_900 },
  { type: "CREDENTIALING", unitCents: 19_900 },
  { type: "LICENSE", unitCents: 9_900 },
]);
const usageEventCreate = mock(async ({ data }: { data: Record<string, unknown> }) => ({ id: "ue_1", ...data }));
const invoiceFindMany = mock(async () => [
  {
    id: "db_inv_1",
    orgId: "org_1",
    periodStart: new Date("2026-03-01"),
    periodEnd: new Date("2026-03-31"),
    subtotalCents: 1000,
    totalCents: 1500,
    status: "PAID",
    lineItems: [],
  },
]);
const invoiceFindUnique = mock(async (_args: { where: { id: string } }) => null as unknown);
const invoiceUpdate = mock(async (_args: { where: { id: string }; data: { status: string } }) => ({}));
const invoiceUpdateMany = mock(async (_args: { where: { id: string }; data: { status: string } }) => ({ count: 1 }));

mock.module("@/lib/db", () => ({
  prisma: {
    usageEvent: { findMany: usageFindMany, create: usageEventCreate },
    invoice: { findMany: invoiceFindMany, findUnique: invoiceFindUnique, update: invoiceUpdate, updateMany: invoiceUpdateMany },
  },
}));

const { rollupUsage, periodRange, getCurrentUsage, listAllInvoices, recordUsageEvent, processInvoicePayment } = await import("./billing");

beforeEach(() => {
  resetMockState();
});

describe("rollupUsage", () => {
  it("sums events by type and applies platform fee", () => {
    const result = rollupUsage({
      platformFeeCents: 150_000,
      events: [
        { type: "CREDENTIALING", unitCents: 19_900 },
        { type: "CREDENTIALING", unitCents: 19_900 },
        { type: "LICENSE", unitCents: 9_900 },
      ],
    });
    expect(result.subtotalCents).toBe(49_700);
    expect(result.totalCents).toBe(199_700);
  });

  it("returns empty lines when no events", () => {
    const result = rollupUsage({ platformFeeCents: 150_000, events: [] });
    expect(result.lines).toEqual([]);
    expect(result.subtotalCents).toBe(0);
    expect(result.totalCents).toBe(150_000);
  });
});

describe("periodRange", () => {
  it("returns the first and last day of the current month", () => {
    const { periodStart, periodEnd } = periodRange("current", new Date(2026, 3, 15));
    expect(periodStart.getMonth()).toBe(3);
    expect(periodStart.getDate()).toBe(1);
    expect(periodEnd.getMonth()).toBe(3);
    expect(periodEnd.getDate()).toBe(30);
  });

  it("returns the previous month for period=previous", () => {
    const { periodStart, periodEnd } = periodRange("previous", new Date(2026, 3, 15));
    expect(periodStart.getMonth()).toBe(2);
    expect(periodEnd.getMonth()).toBe(2);
    expect(periodEnd.getDate()).toBe(31);
  });
});

describe("getCurrentUsage", () => {
  it("queries uninvoiced events and returns rollup with period bounds", async () => {
    usageFindMany.mockClear();
    const usage = await getCurrentUsage("current", "org_test");

    expect(usageFindMany).toHaveBeenCalledTimes(1);
    const call = usageFindMany.mock.calls[0][0] as {
      where: { occurredAt: { gte: Date; lte: Date }; invoiceId: null; orgId: string };
    };
    expect(call.where.invoiceId).toBeNull();
    expect(call.where.orgId).toBe("org_test");
    expect(usage.subtotalCents).toBe(49_700);
    expect(usage.totalCents).toBe(199_700);
    expect(usage.platformFeeCents).toBe(150_000);
  });
});

describe("listAllInvoices", () => {
  it("merges DB and stripe-mock invoices, sorted by periodStart desc", async () => {
    createInvoice({
      customerId: "org_test",
      lines: [{ description: "demo", amount: 5000, quantity: 1 }],
      autoAdvance: true,
    });

    const all = await listAllInvoices("org_test");
    expect(all).toHaveLength(2);
    const stripeRow = all.find((i) => i.id.startsWith("inv_mock_"));
    const dbRow = all.find((i) => i.id === "db_inv_1");
    expect(stripeRow).toBeDefined();
    expect(dbRow).toBeDefined();
    // Stripe invoice was just created (today), DB row is from 2026-03 → stripe sorts first.
    expect(all[0].id).toBe(stripeRow!.id);
  });

  it("uppercases stripe-mock status to match the DB union", async () => {
    createInvoice({
      customerId: "org_test",
      lines: [{ description: "demo", amount: 5000, quantity: 1 }],
      autoAdvance: true,
    });

    const all = await listAllInvoices("org_test");
    const stripeRow = all.find((i) => i.id.startsWith("inv_mock_"))!;
    expect(stripeRow.status).toBe("OPEN");
  });
});

describe("recordUsageEvent", () => {
  it("creates a usage event with the right unitCents and emits a meter event", async () => {
    usageEventCreate.mockClear();
    const event = await recordUsageEvent("CREDENTIALING", "p_1");
    expect(usageEventCreate).toHaveBeenCalledWith({
      data: { orgId: "org_1", type: "CREDENTIALING", providerId: "p_1", unitCents: 19_900 },
    });
    expect(event.id).toBe("ue_1");
    expect(getSubscriptionItems("org_1").credentialing).toBe(1);
  });

  it("uses the right unitCents per type", async () => {
    const cases: Array<[string, number]> = [
      ["LICENSE", 9_900],
      ["ENROLLMENT", 14_900],
      ["MONITORING", 2_900],
    ];
    for (const [type, expected] of cases) {
      usageEventCreate.mockClear();
      await recordUsageEvent(type as "LICENSE" | "ENROLLMENT" | "MONITORING");
      const call = usageEventCreate.mock.calls[0][0] as { data: { unitCents: number } };
      expect(call.data.unitCents).toBe(expected);
    }
  });
});

describe("processInvoicePayment", () => {
  it("uses the stripe-mock path when the invoice exists in stripe-mock state", async () => {
    const invoice = createInvoice({
      customerId: "org_1",
      lines: [{ description: "demo", amount: 1000, quantity: 1 }],
      autoAdvance: true,
    });

    invoiceUpdateMany.mockClear();
    const result = await processInvoicePayment(invoice.id);
    expect(result.success).toBe(true);
    expect(result.paymentIntentId).toBe(`pi_mock_${invoice.id}`);
    expect(invoiceUpdateMany).toHaveBeenCalledWith({ where: { id: invoice.id }, data: { status: "PAID" } });
  });

  it("falls back to DB invoice when not in stripe-mock; marks PAID and returns success", async () => {
    invoiceFindUnique.mockResolvedValueOnce({ id: "inv_db_1", status: "OPEN" });
    invoiceUpdate.mockClear();

    const result = await processInvoicePayment("inv_db_1");
    expect(result.success).toBe(true);
    expect(result.paymentIntentId).toBe("pi_inv_db_1");
    expect(invoiceUpdate).toHaveBeenCalledWith({ where: { id: "inv_db_1" }, data: { status: "PAID" } });
  });

  it("returns error when invoice exists nowhere", async () => {
    invoiceFindUnique.mockResolvedValueOnce(null);
    const result = await processInvoicePayment("ghost");
    expect(result.success).toBe(false);
    expect(result.error).toBe("Invoice not found");
  });

  it("returns error if DB invoice is already PAID", async () => {
    invoiceFindUnique.mockResolvedValueOnce({ id: "inv_paid", status: "PAID" });
    const result = await processInvoicePayment("inv_paid");
    expect(result.success).toBe(false);
    expect(result.error).toBe("Already paid");
  });
});
