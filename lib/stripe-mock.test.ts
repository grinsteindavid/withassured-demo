import { describe, it, expect, beforeEach } from "bun:test";
import {
  createInvoice,
  payInvoice,
  createMeterEvent,
  getSubscriptionItems,
  listInvoices,
  getInvoice,
  resetMockState,
} from "./stripe-mock";

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
