import { describe, it, expect, mock, beforeEach } from "bun:test";

// Use the real `@/lib/stripe-mock` module directly. Its functions are pure
// in-memory operations on a globalThis singleton; resetMockState() in
// beforeEach gives us per-test isolation. Avoiding mock.module on this
// alias here is intentional — under Bun 1.3.x, partial mock.module
// registrations leak across files and corrupt lib/stripe-mock.test.ts,
// which tests the real implementation.
import {
  resetMockState,
  getSubscriptionItems,
  createInvoice,
} from "@/lib/stripe-mock";

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
const subscriptionFindUnique = mock(async (_args: { where: { orgId: string } }) => ({
  orgId: "org_test",
  plan: "STARTUP",
  status: "ACTIVE",
}) as unknown);

mock.module("@/lib/db", () => ({
  prisma: {
    usageEvent: { findMany: usageFindMany, create: usageEventCreate },
    invoice: { findMany: invoiceFindMany, findUnique: invoiceFindUnique, update: invoiceUpdate, updateMany: invoiceUpdateMany },
    subscription: { findUnique: subscriptionFindUnique },
  },
}));

const { rollupUsage, periodRange, isValidUsageType } = await import("./billing-formulas");
const { getCurrentUsage, listAllInvoices, recordUsageEvent, processInvoicePayment, getInvoiceById } = await import("./billing");

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

  it("uses the last unitCents when same type has different values", () => {
    const result = rollupUsage({
      platformFeeCents: 150_000,
      events: [
        { type: "CREDENTIALING", unitCents: 19_900 },
        { type: "CREDENTIALING", unitCents: 29_900 },
      ],
    });
    const line = result.lines.find((l) => l.type === "CREDENTIALING");
    expect(line!.unitCents).toBe(29_900);
    expect(line!.subtotalCents).toBe(49_800);
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

  it("returns 29 days for February in a leap year", () => {
    const { periodStart, periodEnd } = periodRange("current", new Date(2024, 1, 15));
    expect(periodStart.getMonth()).toBe(1);
    expect(periodStart.getDate()).toBe(1);
    expect(periodEnd.getMonth()).toBe(1);
    expect(periodEnd.getDate()).toBe(29);
  });
});

describe("getCurrentUsage", () => {
  it("queries uninvoiced events and returns rollup with plan-based fee", async () => {
    usageFindMany.mockClear();
    subscriptionFindUnique.mockClear();
    const usage = await getCurrentUsage("current", "org_test");

    expect(usageFindMany).toHaveBeenCalledTimes(1);
    expect(subscriptionFindUnique).toHaveBeenCalledTimes(1);
    const call = usageFindMany.mock.calls[0][0] as {
      where: { occurredAt: { gte: Date; lte: Date }; invoiceId: null; orgId: string };
    };
    expect(call.where.invoiceId).toBeNull();
    expect(call.where.orgId).toBe("org_test");
    expect(usage.subtotalCents).toBe(49_700);
    expect(usage.platformFeeCents).toBe(29_900);
    expect(usage.totalCents).toBe(79_600);
  });

  it("returns zero platform fee when no subscription exists", async () => {
    subscriptionFindUnique.mockResolvedValueOnce(null);
    usageFindMany.mockClear();
    const usage = await getCurrentUsage("current", "org_test");

    expect(usage.platformFeeCents).toBe(0);
    expect(usage.totalCents).toBe(49_700);
  });
});

describe("listAllInvoices", () => {
  it("returns DB invoices sorted by periodStart desc", async () => {
    const all = await listAllInvoices("org_1");
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe("db_inv_1");
    expect(all[0].status).toBe("PAID");
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

  it("uses default orgId when omitted", async () => {
    usageEventCreate.mockClear();
    await recordUsageEvent("MONITORING");
    const call = usageEventCreate.mock.calls[0][0] as { data: { orgId: string } };
    expect(call.data.orgId).toBe("org_1");
  });

  it("works without providerId", async () => {
    usageEventCreate.mockClear();
    const event = await recordUsageEvent("LICENSE");
    const call = usageEventCreate.mock.calls[0][0] as { data: { providerId?: string } };
    expect(call.data.providerId).toBeUndefined();
    expect(event.type).toBe("LICENSE");
  });
});

describe("isValidUsageType", () => {
  it("returns true for valid types", () => {
    expect(isValidUsageType("CREDENTIALING")).toBe(true);
    expect(isValidUsageType("LICENSE")).toBe(true);
    expect(isValidUsageType("ENROLLMENT")).toBe(true);
    expect(isValidUsageType("MONITORING")).toBe(true);
  });

  it("returns false for invalid types", () => {
    expect(isValidUsageType("INVALID")).toBe(false);
    expect(isValidUsageType("")).toBe(false);
    expect(isValidUsageType("credentialing")).toBe(false);
  });
});

describe("getInvoiceById", () => {
  it("returns invoice with events when found and org matches", async () => {
    invoiceFindUnique.mockResolvedValueOnce({ id: "inv_1", orgId: "org_1", events: [{ id: "ev_1" }] });
    const result = await getInvoiceById("inv_1", "org_1");
    expect(result).toBeDefined();
    expect(result!.id).toBe("inv_1");
    expect(result!.events).toHaveLength(1);
  });

  it("returns null when invoice belongs to different org", async () => {
    invoiceFindUnique.mockResolvedValueOnce({ id: "inv_1", orgId: "org_2" });
    const result = await getInvoiceById("inv_1", "org_1");
    expect(result).toBeNull();
  });

  it("returns null when invoice not found", async () => {
    invoiceFindUnique.mockResolvedValueOnce(null);
    const result = await getInvoiceById("ghost", "org_1");
    expect(result).toBeNull();
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
