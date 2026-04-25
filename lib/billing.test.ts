import { describe, it, expect, mock, beforeEach } from "bun:test";
import { createInvoice, resetMockState } from "@/lib/stripe-mock";

const usageFindMany = mock(async (_args: { where: Record<string, unknown> }) => [
  { type: "CREDENTIALING", unitCents: 19_900 },
  { type: "CREDENTIALING", unitCents: 19_900 },
  { type: "LICENSE", unitCents: 9_900 },
]);
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

mock.module("@/lib/db", () => ({
  prisma: {
    usageEvent: { findMany: usageFindMany },
    invoice: { findMany: invoiceFindMany },
  },
}));

const { rollupUsage, periodRange, getCurrentUsage, listAllInvoices } = await import("./billing");

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
    const usage = await getCurrentUsage("current");

    expect(usageFindMany).toHaveBeenCalledTimes(1);
    const call = usageFindMany.mock.calls[0][0] as {
      where: { occurredAt: { gte: Date; lte: Date }; invoiceId: null };
    };
    expect(call.where.invoiceId).toBeNull();
    expect(usage.subtotalCents).toBe(49_700);
    expect(usage.totalCents).toBe(199_700);
    expect(usage.platformFeeCents).toBe(150_000);
  });
});

describe("listAllInvoices", () => {
  it("merges DB and stripe-mock invoices, sorted by periodStart desc", async () => {
    createInvoice({
      customerId: "org_1",
      lines: [{ description: "demo", amount: 5000, quantity: 1 }],
      autoAdvance: true,
    });

    const all = await listAllInvoices();
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
      customerId: "org_1",
      lines: [{ description: "demo", amount: 5000, quantity: 1 }],
      autoAdvance: true,
    });

    const all = await listAllInvoices();
    const stripeRow = all.find((i) => i.id.startsWith("inv_mock_"))!;
    expect(stripeRow.status).toBe("OPEN");
  });
});
