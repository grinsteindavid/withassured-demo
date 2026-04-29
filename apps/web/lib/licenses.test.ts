import { describe, it, expect, mock } from "bun:test";

const findMany = mock(async (_args: { where: Record<string, unknown> }) => [
  { id: "l_1", state: "CA", number: "MD12345", expiresAt: new Date("2026-12-31"), status: "ACTIVE", providerId: "p_1", workflowId: null },
]);

mock.module("@/lib/db", () => ({
  prisma: { license: { findMany } },
}));

const { getLicenses } = await import("./licenses");

describe("getLicenses", () => {
  it("returns all licenses when no filter is provided", async () => {
    findMany.mockClear();
    const licenses = await getLicenses();
    expect(findMany).toHaveBeenCalledWith({ where: {} });
    expect(licenses).toEqual([
      { id: "l_1", state: "CA", number: "MD12345", expiresAt: new Date("2026-12-31"), status: "ACTIVE", providerId: "p_1", workflowId: null },
    ]);
  });

  it("filters by expiresAt when expiringInDays is provided", async () => {
    findMany.mockClear();
    const before = Date.now();
    const licenses = await getLicenses(30);
    const after = Date.now();

    expect(findMany).toHaveBeenCalledTimes(1);
    const callArgs = findMany.mock.calls[0][0] as { where: { expiresAt: { lte: Date } } };
    const lte = callArgs.where.expiresAt.lte.getTime();
    expect(lte).toBeGreaterThanOrEqual(before + 30 * 24 * 60 * 60 * 1000);
    expect(lte).toBeLessThanOrEqual(after + 30 * 24 * 60 * 60 * 1000);
    expect(licenses).toEqual([
      { id: "l_1", state: "CA", number: "MD12345", expiresAt: new Date("2026-12-31"), status: "ACTIVE", providerId: "p_1", workflowId: null },
    ]);
  });
});
