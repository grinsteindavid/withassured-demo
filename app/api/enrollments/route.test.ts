import { describe, it, expect, mock } from "bun:test";

const findMany = mock(async () => [
  { id: "e_1", providerId: "p_1", payer: "Aetna", state: "CA", status: "PENDING", workflowId: "enr_1" },
]);

mock.module("@/lib/db", () => ({
  prisma: { payerEnrollment: { findMany } },
}));

const { GET } = await import("./route");

describe("GET /api/enrollments", () => {
  it("returns the enrollment list", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual([
      { id: "e_1", providerId: "p_1", payer: "Aetna", state: "CA", status: "PENDING", workflowId: "enr_1" },
    ]);
    expect(findMany).toHaveBeenCalled();
  });
});
