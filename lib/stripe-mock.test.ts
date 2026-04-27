import { describe, it, expect, beforeEach, mock } from "bun:test";
import {
  createInvoice,
  payInvoice,
  createMeterEvent,
  getSubscriptionItems,
  listInvoices,
  getInvoice,
  resetMockState,
  syncStripeMockFromDB,
  listPaymentMethods,
  getSubscription,
} from "./stripe-mock";

const paymentMethodFindMany = mock(async () => [] as unknown[]);
const subscriptionFindMany = mock(async () => [] as unknown[]);
const invoiceFindMany = mock(async () => [] as unknown[]);

mock.module("@/lib/db", () => ({
  prisma: {
    paymentMethod: { findMany: paymentMethodFindMany },
    subscription: { findMany: subscriptionFindMany },
    invoice: { findMany: invoiceFindMany },
  },
}));

describe("stripe-mock", () => {
  beforeEach(() => {
    resetMockState();
  });

  describe("createInvoice", () => {
    it("creates an invoice with open status when autoAdvance is true", () => {
      const invoice = createInvoice({
        customerId: "org_1",
        lines: [{ description: "Credentialing", amount: 19900, quantity: 2 }],
        autoAdvance: true,
      });

      expect(invoice.customer).toBe("org_1");
      expect(invoice.status).toBe("open");
      expect(invoice.amount_due).toBe(19900);
      expect(invoice.lines).toHaveLength(1);
    });

    it("creates a draft invoice when autoAdvance is false", () => {
      const invoice = createInvoice({
        customerId: "org_1",
        lines: [{ description: "License", amount: 9900, quantity: 1 }],
        autoAdvance: false,
      });

      expect(invoice.status).toBe("draft");
    });
  });

  describe("payInvoice", () => {
    it("marks an open invoice as paid", () => {
      const invoice = createInvoice({
        customerId: "org_1",
        lines: [{ description: "Monitoring", amount: 2900, quantity: 3 }],
        autoAdvance: true,
      });

      const result = payInvoice(invoice.id);
      expect(result).not.toBeNull();
      expect(result?.invoice.status).toBe("paid");
      expect(result?.invoice.amount_paid).toBe(2900);
      expect(result?.paymentIntentId).toContain(invoice.id);
    });

    it("returns null for unknown invoice", () => {
      const result = payInvoice("inv_nonexistent");
      expect(result).toBeNull();
    });

    it("returns null for already paid invoice", () => {
      const invoice = createInvoice({
        customerId: "org_1",
        lines: [{ description: "X", amount: 100, quantity: 1 }],
        autoAdvance: true,
      });

      payInvoice(invoice.id);
      const second = payInvoice(invoice.id);
      expect(second).toBeNull();
    });
  });

  describe("createMeterEvent + getSubscriptionItems", () => {
    it("accumulates meter events per customer", () => {
      createMeterEvent({ event_name: "credentialing", customer: "org_1" });
      createMeterEvent({ event_name: "credentialing", customer: "org_1" });
      createMeterEvent({ event_name: "license", customer: "org_1", value: 3 });

      const items = getSubscriptionItems("org_1");
      expect(items.credentialing).toBe(2);
      expect(items.license).toBe(3);
    });

    it("isolates customers", () => {
      createMeterEvent({ event_name: "monitoring", customer: "org_a" });
      createMeterEvent({ event_name: "monitoring", customer: "org_b", value: 5 });

      expect(getSubscriptionItems("org_a").monitoring).toBe(1);
      expect(getSubscriptionItems("org_b").monitoring).toBe(5);
    });
  });

  describe("listInvoices", () => {
    it("filters by customer", () => {
      createInvoice({ customerId: "org_a", lines: [{ description: "A", amount: 100, quantity: 1 }] });
      createInvoice({ customerId: "org_b", lines: [{ description: "B", amount: 200, quantity: 1 }] });

      expect(listInvoices("org_a")).toHaveLength(1);
      expect(listInvoices("org_a")[0].customer).toBe("org_a");
      expect(listInvoices()).toHaveLength(2);
    });
  });

  describe("getInvoice", () => {
    it("retrieves an invoice by id", () => {
      const invoice = createInvoice({
        customerId: "org_1",
        lines: [{ description: "Test", amount: 500, quantity: 1 }],
      });

      expect(getInvoice(invoice.id)?.amount_due).toBe(500);
      expect(getInvoice("missing")).toBeUndefined();
    });
  });
});

describe("Global State Pattern", () => {
  it("stores state in globalThis", () => {
    const globalForStripe = globalThis as unknown as {
      stripeState?: unknown;
    };
    expect(globalForStripe.stripeState).toBeDefined();
  });

  it("initializes empty state on first load", () => {
    resetMockState();
    const invoice = createInvoice({
      customerId: "org_test",
      lines: [{ description: "Test", amount: 100, quantity: 1 }],
    });
    expect(invoice.id).toBeTruthy();
  });

  it("preserves state across module reload simulation", () => {
    resetMockState();
    const invoice1 = createInvoice({
      customerId: "org_test",
      lines: [{ description: "Test", amount: 100, quantity: 1 }],
    });
    const invoiceId = invoice1.id;

    // Simulate state persistence (in real hot-reload, globalThis persists)
    const globalForStripe = globalThis as unknown as {
      stripeState?: { invoices: Map<string, unknown> };
    };
    const invoices = globalForStripe.stripeState?.invoices;
    expect(invoices?.has(invoiceId)).toBe(true);
  });
});

describe("syncStripeMockFromDB", () => {
  beforeEach(() => {
    resetMockState();
    paymentMethodFindMany.mockClear();
    subscriptionFindMany.mockClear();
    invoiceFindMany.mockClear();
  });

  it("syncs payment methods from DB to Stripe mock", async () => {
    paymentMethodFindMany.mockResolvedValueOnce([
      {
        id: "pm_db_1",
        stripePaymentMethodId: "pm_mock_123",
        orgId: "org_1",
        type: "CARD",
        last4: "4242",
        expiryMonth: 12,
        expiryYear: 2025,
        brand: "Visa",
        isDefault: true,
        createdAt: new Date("2026-01-01"),
      },
    ]);

    await syncStripeMockFromDB();

    const methods = listPaymentMethods("org_1");
    expect(methods).toHaveLength(1);
    expect(methods[0].id).toBe("pm_mock_123");
    expect(methods[0].type).toBe("card");
    expect(methods[0].last4).toBe("4242");
    expect(methods[0].isDefault).toBe(true);
  });

  it("syncs subscriptions from DB to Stripe mock", async () => {
    subscriptionFindMany.mockResolvedValueOnce([
      {
        id: "sub_db_1",
        orgId: "org_1",
        plan: "STARTUP",
        status: "ACTIVE",
        currentPeriodStart: new Date("2026-01-01"),
        currentPeriodEnd: new Date("2026-02-01"),
        cancelAtPeriodEnd: false,
        createdAt: new Date("2026-01-01"),
      },
    ]);

    await syncStripeMockFromDB();

    const subscription = getSubscription("org_1");
    expect(subscription).toBeDefined();
    expect(subscription?.id).toBe("sub_db_1");
    expect(subscription?.plan).toBe("STARTUP");
    expect(subscription?.status).toBe("ACTIVE");
  });

  it("syncs invoices from DB to Stripe mock", async () => {
    invoiceFindMany.mockResolvedValueOnce([
      {
        id: "inv_db_1",
        orgId: "org_1",
        totalCents: 5000,
        status: "OPEN",
        lineItems: [{ description: "Test", amount: 5000, quantity: 1 }],
        createdAt: new Date("2026-01-01"),
      },
    ]);

    await syncStripeMockFromDB();

    const invoices = listInvoices("org_1");
    const dbInvoice = invoices.find((inv) => inv.id === "inv_db_1");
    expect(dbInvoice).toBeDefined();
    expect(dbInvoice?.amount_due).toBe(5000);
    expect(dbInvoice?.status).toBe("open");
  });

  it("transforms DB types to Stripe mock types", async () => {
    paymentMethodFindMany.mockResolvedValueOnce([
      {
        id: "pm_db_1",
        stripePaymentMethodId: "pm_mock_123",
        orgId: "org_1",
        type: "CARD",
        last4: "4242",
        expiryMonth: 12,
        expiryYear: 2025,
        brand: "Visa",
        isDefault: true,
        createdAt: new Date("2026-01-01"),
      },
    ]);
    invoiceFindMany.mockResolvedValueOnce([
      {
        id: "inv_db_1",
        orgId: "org_1",
        totalCents: 5000,
        status: "OPEN",
        lineItems: [{ description: "Test", amount: 5000, quantity: 1 }],
        createdAt: new Date("2026-01-01"),
      },
    ]);

    await syncStripeMockFromDB();

    const methods = listPaymentMethods("org_1");
    expect(methods[0].type).toBe("card"); // CARD → card

    const invoices = listInvoices("org_1");
    const dbInvoice = invoices.find((inv) => inv.id === "inv_db_1");
    expect(dbInvoice?.status).toBe("open"); // OPEN → open
  });

  it("handles empty DB gracefully", async () => {
    paymentMethodFindMany.mockResolvedValueOnce([]);
    subscriptionFindMany.mockResolvedValueOnce([]);
    invoiceFindMany.mockResolvedValueOnce([]);

    await syncStripeMockFromDB();

    expect(listPaymentMethods("org_1")).toHaveLength(0);
    expect(getSubscription("org_1")).toBeUndefined();
    expect(listInvoices("org_1")).toHaveLength(0);
  });
});

describe("Post-Sync Functionality", () => {
  beforeEach(() => {
    resetMockState();
    paymentMethodFindMany.mockClear();
  });

  it("listPaymentMethods returns synced data", async () => {
    paymentMethodFindMany.mockResolvedValueOnce([
      {
        id: "pm_db_1",
        stripePaymentMethodId: "pm_mock_123",
        orgId: "org_1",
        type: "CARD",
        last4: "4242",
        expiryMonth: 12,
        expiryYear: 2025,
        brand: "Visa",
        isDefault: true,
        createdAt: new Date("2026-01-01"),
      },
    ]);

    await syncStripeMockFromDB();

    const methods = listPaymentMethods("org_1");
    expect(methods).toHaveLength(1);
    expect(methods[0].id).toBe("pm_mock_123");
  });
});
