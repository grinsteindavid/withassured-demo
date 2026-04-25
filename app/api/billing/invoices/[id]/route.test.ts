import { describe, it, expect, mock } from "bun:test";

const findUnique = mock(async (_args: { where: { id: string }; include: unknown }) => null as unknown);

mock.module("@/lib/db", () => ({
  prisma: { invoice: { findUnique } },
}));

const { GET } = await import("./route");

const callGet = (id: string) =>
  GET(new Request(`http://localhost/api/billing/invoices/${id}`), {
    params: Promise.resolve({ id }),
  });

describe("GET /api/billing/invoices/:id", () => {
  it("returns 404 when invoice is not found", async () => {
    findUnique.mockResolvedValueOnce(null);
    const response = await callGet("missing");
    expect(response.status).toBe(404);
  });

  it("returns invoice with events when found", async () => {
    const invoice = {
      id: "inv_1",
      orgId: "org_1",
      totalCents: 5000,
      status: "OPEN",
      events: [{ id: "ue_1", type: "CREDENTIALING", unitCents: 19900 }],
    };
    findUnique.mockResolvedValueOnce(invoice);

    const response = await callGet("inv_1");
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual(invoice);
    expect(findUnique).toHaveBeenCalledWith({ where: { id: "inv_1" }, include: { events: true } });
  });
});
