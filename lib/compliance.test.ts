import { describe, it, expect, mock } from "bun:test";

const findMany = mock(async (_args: { where: Record<string, unknown> }) => [
  { id: "c_1", providerId: "p_1", source: "OIG", result: "CLEAN", checkedAt: new Date() },
]);

mock.module("@/lib/db", () => ({
  prisma: { complianceCheck: { findMany } },
}));

const { getComplianceChecks } = await import("./compliance");

describe("getComplianceChecks", () => {
  it("returns all checks when no providerId is given", async () => {
    findMany.mockClear();
    const checks = await getComplianceChecks();
    expect(findMany).toHaveBeenCalledWith({ where: {} });
    expect(checks).toEqual([{ id: "c_1", providerId: "p_1", source: "OIG", result: "CLEAN", checkedAt: expect.any(Date) }]);
  });

  it("filters by providerId when provided", async () => {
    findMany.mockClear();
    const checks = await getComplianceChecks("p_42");
    expect(findMany).toHaveBeenCalledWith({ where: { providerId: "p_42" } });
    expect(checks).toEqual([{ id: "c_1", providerId: "p_1", source: "OIG", result: "CLEAN", checkedAt: expect.any(Date) }]);
  });
});
