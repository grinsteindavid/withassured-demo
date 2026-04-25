import { describe, it, expect, mock } from "bun:test";

const findMany = mock(async (_args: { where: Record<string, unknown> }) => [
  { id: "c_1", providerId: "p_1", source: "OIG", result: "CLEAN" },
]);

mock.module("@/lib/db", () => ({
  prisma: { complianceCheck: { findMany } },
}));

const { GET } = await import("./route");

describe("GET /api/compliance", () => {
  it("returns all checks when no providerId is given", async () => {
    findMany.mockClear();
    const response = await GET(new Request("http://localhost/api/compliance"));
    expect(response.status).toBe(200);
    expect(findMany).toHaveBeenCalledWith({ where: {} });
  });

  it("filters by providerId when provided", async () => {
    findMany.mockClear();
    const response = await GET(new Request("http://localhost/api/compliance?providerId=p_42"));
    expect(response.status).toBe(200);
    expect(findMany).toHaveBeenCalledWith({ where: { providerId: "p_42" } });
  });
});
