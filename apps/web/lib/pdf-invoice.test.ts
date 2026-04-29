import { describe, it, expect } from "bun:test";
import { generateInvoicePdf } from "./pdf-invoice";

const sampleInvoice = {
  id: "inv_test_1",
  periodStart: "2024-01-01T00:00:00Z",
  periodEnd: "2024-01-31T00:00:00Z",
  subtotalCents: 50000,
  totalCents: 55000,
  status: "OPEN",
  lineItems: [
    { description: "Platform Fee", amount: 50000, quantity: 1 },
    { description: "Usage charges", amount: 5000, quantity: 10 },
  ],
};

describe("generateInvoicePdf", () => {
  it("returns a Uint8Array starting with %PDF", async () => {
    const pdf = await generateInvoicePdf(sampleInvoice, "Test Org");
    expect(pdf).toBeInstanceOf(Uint8Array);
    expect(pdf.length).toBeGreaterThan(0);

    const header = new TextDecoder().decode(pdf.slice(0, 4));
    expect(header).toBe("%PDF");
  });

  it("produces a valid PDF that pdf-lib can reload", async () => {
    const { PDFDocument } = await import("pdf-lib");
    const pdf = await generateInvoicePdf(sampleInvoice, "Acme Corp");
    const doc = await PDFDocument.load(pdf);
    expect(doc.getPageCount()).toBe(1);
  });

  it("handles empty line items", async () => {
    const pdf = await generateInvoicePdf(
      { ...sampleInvoice, lineItems: [] },
      "Empty Org",
    );
    expect(pdf).toBeInstanceOf(Uint8Array);
    expect(pdf.length).toBeGreaterThan(0);
  });
});
