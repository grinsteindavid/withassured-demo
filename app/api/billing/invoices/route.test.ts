import { describe, it, expect, mock } from "bun:test";

const listAllInvoices = mock(async () => [
  { id: "inv_1", orgId: "org_1", status: "OPEN", totalCents: 1000 },
]);

mock.module("@/lib/billing", () => ({ listAllInvoices }));

const { GET } = await import("./route");

describe("GET /api/billing/invoices", () => {
  it("delegates to listAllInvoices and returns the list", async () => {
    listAllInvoices.mockClear();
    const response = await GET();
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual([{ id: "inv_1", orgId: "org_1", status: "OPEN", totalCents: 1000 }]);
    expect(listAllInvoices).toHaveBeenCalled();
  });
});
