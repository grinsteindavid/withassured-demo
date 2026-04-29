import { describe, it, expect, mock, beforeEach } from "bun:test";

const providerFindUnique = mock(async () => ({}));
const licenseFindMany = mock(async () => []);
const payerEnrollmentFindMany = mock(async () => []);
const complianceCheckFindUnique = mock(async () => ({}));
const alertCreate = mock(async () => ({}));

mock.module("@/lib/db", () => ({
  prisma: {
    provider: { findUnique: providerFindUnique },
    license: { findMany: licenseFindMany },
    payerEnrollment: { findMany: payerEnrollmentFindMany },
    complianceCheck: { findUnique: complianceCheckFindUnique },
    alert: { create: alertCreate },
  },
}));

const { createAlert } = await import("./store");

beforeEach(() => {
  providerFindUnique.mockClear();
  licenseFindMany.mockClear();
  payerEnrollmentFindMany.mockClear();
  complianceCheckFindUnique.mockClear();
  alertCreate.mockClear();
});

describe("createAlert integration", () => {
  it("creates alert for credentialing workflow completion", async () => {
    providerFindUnique.mockResolvedValueOnce({ orgId: "org_1", id: "provider_1" });
    alertCreate.mockResolvedValueOnce({});

    await createAlert("cred_provider_1", "WORKFLOW_COMPLETED", "INFO", "Credentialing workflow completed", "The credentialing workflow has completed successfully.");

    expect(providerFindUnique).toHaveBeenCalledWith({ where: { id: "provider_1" } });
    expect(alertCreate).toHaveBeenCalledWith({
      data: {
        orgId: "org_1",
        type: "WORKFLOW_COMPLETED",
        severity: "INFO",
        title: "Credentialing workflow completed",
        message: "The credentialing workflow has completed successfully.",
        workflowId: "cred_provider_1",
        entityType: "credentialing",
        entityId: "provider_1",
      },
    });
  });

  it("creates alert for license workflow failure", async () => {
    licenseFindMany.mockResolvedValueOnce([{ id: "license_1", providerId: "provider_1" }] as any);
    providerFindUnique.mockResolvedValueOnce({ orgId: "org_1", id: "provider_1" });
    alertCreate.mockResolvedValueOnce({});

    await createAlert("lic_workflow_1", "WORKFLOW_FAILED", "ERROR", "Licensing workflow failed", "The licensing workflow has failed - please review the workflow details.");

    expect(licenseFindMany).toHaveBeenCalledWith({ where: { workflowId: "lic_workflow_1" } });
    expect(providerFindUnique).toHaveBeenCalledWith({ where: { id: "provider_1" } });
    expect(alertCreate).toHaveBeenCalledWith({
      data: {
        orgId: "org_1",
        type: "WORKFLOW_FAILED",
        severity: "ERROR",
        title: "Licensing workflow failed",
        message: "The licensing workflow has failed - please review the workflow details.",
        workflowId: "lic_workflow_1",
        entityType: "license",
        entityId: "license_1",
      },
    });
  });

  it("creates alert for enrollment workflow completion", async () => {
    payerEnrollmentFindMany.mockResolvedValueOnce([{ id: "enrollment_1", providerId: "provider_1" }] as any);
    providerFindUnique.mockResolvedValueOnce({ orgId: "org_1", id: "provider_1" });
    alertCreate.mockResolvedValueOnce({});

    await createAlert("enr_workflow_1", "WORKFLOW_COMPLETED", "INFO", "Enrollment workflow completed", "The enrollment workflow has completed successfully.");

    expect(payerEnrollmentFindMany).toHaveBeenCalledWith({ where: { workflowId: "enr_workflow_1" } });
    expect(providerFindUnique).toHaveBeenCalledWith({ where: { id: "provider_1" } });
    expect(alertCreate).toHaveBeenCalledWith({
      data: {
        orgId: "org_1",
        type: "WORKFLOW_COMPLETED",
        severity: "INFO",
        title: "Enrollment workflow completed",
        message: "The enrollment workflow has completed successfully.",
        workflowId: "enr_workflow_1",
        entityType: "enrollment",
        entityId: "enrollment_1",
      },
    });
  });

  it("creates alert for compliance workflow failure", async () => {
    complianceCheckFindUnique.mockResolvedValueOnce({ id: "check_1", providerId: "provider_1" });
    providerFindUnique.mockResolvedValueOnce({ orgId: "org_1", id: "provider_1" });
    alertCreate.mockResolvedValueOnce({});

    await createAlert("comp_check_1", "WORKFLOW_FAILED", "ERROR", "Compliance workflow failed", "The compliance workflow has failed - please review the workflow details.");

    expect(complianceCheckFindUnique).toHaveBeenCalledWith({ where: { id: "check_1" } });
    expect(providerFindUnique).toHaveBeenCalledWith({ where: { id: "provider_1" } });
    expect(alertCreate).toHaveBeenCalledWith({
      data: {
        orgId: "org_1",
        type: "WORKFLOW_FAILED",
        severity: "ERROR",
        title: "Compliance workflow failed",
        message: "The compliance workflow has failed - please review the workflow details.",
        workflowId: "comp_check_1",
        entityType: "compliance",
        entityId: "check_1",
      },
    });
  });

  it("does not create alert when provider not found", async () => {
    providerFindUnique.mockResolvedValueOnce(null as any);
    alertCreate.mockResolvedValueOnce({});

    await createAlert("cred_provider_1", "WORKFLOW_COMPLETED", "INFO", "Credentialing workflow completed", "The credentialing workflow has completed successfully.");

    expect(providerFindUnique).toHaveBeenCalledWith({ where: { id: "provider_1" } });
    expect(alertCreate).not.toHaveBeenCalled();
  });
});
