import { describe, it, expect, mock } from "bun:test";

const findMany = mock(async (_args: { where: Record<string, unknown> }) => [
  { id: "l_1", state: "CA", number: "MD12345", expiresAt: new Date("2026-12-31"), status: "ACTIVE" },
]);

mock.module("@/lib/db", () => ({
  prisma: { license: { findMany } },
}));

const { GET } = await import("./route");

describe("GET /api/licenses", () => {
  it("returns all licenses when no query param is provided", async () => {
    findMany.mockClear();
    const response = await GET(new Request("http://localhost/api/licenses"));
    expect(response.status).toBe(200);
    expect(findMany).toHaveBeenCalledWith({ where: {} });
  });

  it("filters by expiresAt when expiringInDays is provided", async () => {
    findMany.mockClear();
    const before = Date.now();
    const response = await GET(new Request("http://localhost/api/licenses?expiringInDays=30"));
    const after = Date.now();

    expect(response.status).toBe(200);
    expect(findMany).toHaveBeenCalledTimes(1);
    const callArgs = findMany.mock.calls[0][0] as { where: { expiresAt: { lte: Date } } };
    const lte = callArgs.where.expiresAt.lte.getTime();
    expect(lte).toBeGreaterThanOrEqual(before + 30 * 24 * 60 * 60 * 1000);
    expect(lte).toBeLessThanOrEqual(after + 30 * 24 * 60 * 60 * 1000);
  });

  it("returns 400 on invalid query input", async () => {
    const response = await GET(new Request("http://localhost/api/licenses?expiringInDays=not-a-number"));
    expect(response.status).toBe(400);
  });
});
