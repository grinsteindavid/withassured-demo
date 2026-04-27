import { describe, it, expect, mock } from "bun:test";

const payerEnrollmentFindMany = mock(async () => []);
const payerEnrollmentCount = mock(async () => 0);
const payerEnrollmentCreate = mock(async () => ({ id: "enr_new" }));
const payerEnrollmentUpdate = mock(async () => ({ id: "enr_new", workflowId: "enr_enr_new" }));
const payerEnrollmentFindUnique = mock(async () => ({ id: "enr_new", workflowId: "enr_enr_new" }));
const providerFindMany = mock(async () => []);
const providerCount = mock(async () => 0);
const providerFindFirst = mock(async () => ({ id: "prov_1", orgId: "org_test" }) as { id: string; orgId: string } | null);
const credentialingCaseCount = mock(async () => 0);
const complianceCheckCount = mock(async () => 0);
const licenseCount = mock(async () => 0);

const controlsCreate = mock(() => {});

mock.module("@/lib/db", () => ({
  prisma: {
    payerEnrollment: {
      findMany: payerEnrollmentFindMany,
      count: payerEnrollmentCount,
      create: payerEnrollmentCreate,
      update: payerEnrollmentUpdate,
      findUnique: payerEnrollmentFindUnique,
    },
    provider: { findMany: providerFindMany, count: providerCount, findFirst: providerFindFirst },
    credentialingCase: { count: credentialingCaseCount },
    complianceCheck: { count: complianceCheckCount },
    license: { count: licenseCount },
  },
}));

import * as temporalClient from "@/lib/temporal/client";

mock.module("@/lib/temporal/client", () => ({
  ...temporalClient,
  controls: { ...temporalClient.controls, create: controlsCreate },
}));

const { listPayerEnrollments, listProviders, getDashboardMetrics, createPayerEnrollment } = await import("./enrollment");

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

describe("createPayerEnrollment", () => {
  it("creates enrollment and spawns workflow", async () => {
    payerEnrollmentCreate.mockClear();
    payerEnrollmentUpdate.mockClear();
    controlsCreate.mockClear();

    const data = {
      providerId: "prov_1",
      payer: "Aetna",
      state: "NY",
      submittedAt: "2026-04-27T00:00:00.000Z",
    };

    const result = await createPayerEnrollment(data, "org_test");

    expect(payerEnrollmentCreate).toHaveBeenCalledWith({
      data: {
        providerId: "prov_1",
        payer: "Aetna",
        state: "NY",
        status: "PENDING",
        submittedAt: new Date(data.submittedAt),
      },
    });
    expect(payerEnrollmentUpdate).toHaveBeenCalledWith({
      where: { id: "enr_new" },
      data: { workflowId: "enr_enr_new" },
    });
    expect(controlsCreate).toHaveBeenCalledWith("enr_enr_new", {
      status: "RUNNING",
      completedCount: 0,
    });
    expect(result).toBeTruthy();
  });

  it("throws when provider not found", async () => {
    providerFindFirst.mockResolvedValueOnce(null);

    await expect(
      createPayerEnrollment(
        { providerId: "prov_missing", payer: "Aetna", state: "NY" },
        "org_test",
      ),
    ).rejects.toThrow("Provider not found");
  });
});
