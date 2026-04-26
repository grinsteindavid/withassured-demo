import { describe, it, expect, mock } from "bun:test";

const payerEnrollmentFindMany = mock(async (_args: unknown) => []);
const payerEnrollmentCount = mock(async (_args: unknown) => 0);
const providerFindMany = mock(async (_args: unknown) => []);
const providerCount = mock(async (_args: unknown) => 0);
const credentialingCaseCount = mock(async (_args: unknown) => 0);
const complianceCheckCount = mock(async (_args: unknown) => 0);
const licenseCount = mock(async (_args: unknown) => 0);

mock.module("@/lib/db", () => ({
  prisma: {
    payerEnrollment: { findMany: payerEnrollmentFindMany, count: payerEnrollmentCount },
    provider: { findMany: providerFindMany, count: providerCount },
    credentialingCase: { count: credentialingCaseCount },
    complianceCheck: { count: complianceCheckCount },
    license: { count: licenseCount },
  },
}));

const { listPayerEnrollments, listProviders, getDashboardMetrics } = await import("./enrollment");

describe("listPayerEnrollments", () => {
  it("queries enrollments filtered by orgId", async () => {
    payerEnrollmentFindMany.mockClear();
    await listPayerEnrollments("org_test");
    expect(payerEnrollmentFindMany).toHaveBeenCalledWith({
      where: { provider: { orgId: "org_test" } },
    });
  });
});

describe("listProviders", () => {
  it("queries providers filtered by orgId with select", async () => {
    providerFindMany.mockClear();
    await listProviders("org_test");
    expect(providerFindMany).toHaveBeenCalledWith({
      where: { orgId: "org_test" },
      select: { id: true, name: true },
    });
  });
});

describe("getDashboardMetrics", () => {
  it("returns all dashboard counts for an org", async () => {
    providerCount.mockResolvedValueOnce(5);
    credentialingCaseCount.mockResolvedValueOnce(3);
    payerEnrollmentCount.mockResolvedValueOnce(2);
    complianceCheckCount.mockResolvedValueOnce(1);
    licenseCount.mockResolvedValueOnce(0);

    const metrics = await getDashboardMetrics("org_test");

    expect(metrics.totalProviders).toBe(5);
    expect(metrics.activeCredentials).toBe(3);
    expect(metrics.pendingEnrollments).toBe(2);
    expect(metrics.complianceAlerts).toBe(1);
    expect(metrics.expiredLicenses).toBe(0);
  });
});
