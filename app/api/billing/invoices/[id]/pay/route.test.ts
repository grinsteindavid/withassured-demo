import { describe, it, expect, mock, beforeEach } from "bun:test";
import { createInvoice, resetMockState } from "@/lib/stripe-mock";

const findUnique = mock(async (_args: { where: { id: string } }) => null as unknown);
const update = mock(async (_args: { where: { id: string }; data: { status: string } }) => ({}));
const updateMany = mock(async (_args: { where: { id: string }; data: { status: string } }) => ({ count: 1 }));

mock.module("@/lib/db", () => ({
  prisma: { invoice: { findUnique, update, updateMany } },
}));

const { POST } = await import("./route");

const callPost = (id: string) =>
  POST(new Request(`http://localhost/api/billing/invoices/${id}/pay`, { method: "POST" }), {
    params: Promise.resolve({ id }),
  });

beforeEach(() => {
  resetMockState();
  findUnique.mockReset();
  update.mockReset();
  updateMany.mockReset();
  updateMany.mockResolvedValue({ count: 1 });
  update.mockResolvedValue({});
});

describe("POST /api/billing/invoices/:id/pay", () => {
  it("uses the stripe-mock path when the invoice exists in stripe-mock state", async () => {
    const invoice = createInvoice({
      customerId: "org_1",
      lines: [{ description: "demo", amount: 1000, quantity: 1 }],
      autoAdvance: true,
    });

    const response = await callPost(invoice.id);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.paymentIntentId).toBe(`pi_mock_${invoice.id}`);
    expect(updateMany).toHaveBeenCalledWith({ where: { id: invoice.id }, data: { status: "PAID" } });
  });

  it("falls back to DB invoice when not in stripe-mock; marks PAID and returns success", async () => {
    findUnique.mockResolvedValueOnce({ id: "inv_db_1", status: "OPEN" });

    const response = await callPost("inv_db_1");
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({ success: true, paymentIntentId: "pi_inv_db_1" });
    expect(update).toHaveBeenCalledWith({ where: { id: "inv_db_1" }, data: { status: "PAID" } });
  });

  it("returns 404 when invoice exists nowhere", async () => {
    findUnique.mockResolvedValueOnce(null);
    const response = await callPost("ghost");
    expect(response.status).toBe(404);
  });

  it("returns 400 if DB invoice is already PAID", async () => {
    findUnique.mockResolvedValueOnce({ id: "inv_paid", status: "PAID" });
    const response = await callPost("inv_paid");
    expect(response.status).toBe(400);
  });
});
