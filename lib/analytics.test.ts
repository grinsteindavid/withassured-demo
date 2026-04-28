import { describe, it, expect, mock, beforeEach } from "bun:test";

const groupByMock = mock(async () => [] as any[]);
const findManyMock = mock(async () => [] as any[]);
const findUniqueMock = mock(async () => null as any);

mock.module("@/lib/db", () => ({
  prisma: {
    credentialingCase: {
      groupBy: groupByMock,
      findMany: findManyMock,
    },
    license: {
      groupBy: groupByMock,
      findMany: findManyMock,
    },
    payerEnrollment: {
      groupBy: groupByMock,
      findMany: findManyMock,
    },
    complianceCheck: {
      groupBy: groupByMock,
    },
    billingPlan: {
      findUnique: findUniqueMock,
    },
    usageEvent: {
      findMany: findManyMock,
    },
  },
}));

import {
  getTimeToRevenueData,
  getWorkflowSuccessRates,
  getLicenseExpirationData,
  getUsageCostData,
  getEnrollmentVelocityData,
} from "./analytics";

describe("analytics", () => {
  const orgId = "test_org";

  beforeEach(() => {
    groupByMock.mockReset();
    findManyMock.mockReset();
    findUniqueMock.mockReset();
  });

  describe("getTimeToRevenueData", () => {
    it("returns empty array when no credentialing cases exist", async () => {
      findManyMock.mockResolvedValueOnce([]);
      const result = await getTimeToRevenueData(orgId, 30);
      expect(result).toBeArray();
      expect(result.length).toBeGreaterThan(0);
    });

    it("groups completed cases by month", async () => {
      findManyMock.mockResolvedValueOnce([
        { updatedAt: new Date("2026-01-15") },
      ]);
      const result = await getTimeToRevenueData(orgId, 90);
      expect(result).toBeArray();
    });
  });

  describe("getWorkflowSuccessRates", () => {
    it("returns workflow data for all types", async () => {
      groupByMock.mockResolvedValueOnce([]);
      groupByMock.mockResolvedValueOnce([]);
      groupByMock.mockResolvedValueOnce([]);
      groupByMock.mockResolvedValueOnce([]);

      const result = await getWorkflowSuccessRates(orgId);
      expect(result).toBeArray();
      expect(result.length).toBe(4);
      expect(result[0].workflowType).toBe("Credentialing");
      expect(result[1].workflowType).toBe("Licensing");
      expect(result[2].workflowType).toBe("Enrollment");
      expect(result[3].workflowType).toBe("Compliance");
    });

    it("returns zero counts when no data exists", async () => {
      groupByMock.mockResolvedValueOnce([]);
      groupByMock.mockResolvedValueOnce([]);
      groupByMock.mockResolvedValueOnce([]);
      groupByMock.mockResolvedValueOnce([]);

      const result = await getWorkflowSuccessRates(orgId);
      result.forEach((workflow) => {
        expect(workflow.completed).toBe(0);
        expect(workflow.failed).toBe(0);
        expect(workflow.inProgress).toBe(0);
      });
    });
  });

  describe("getLicenseExpirationData", () => {
    it("returns expiration buckets", async () => {
      findManyMock.mockResolvedValueOnce([]);
      const result = await getLicenseExpirationData(orgId);
      expect(result).toBeArray();
      expect(result.length).toBe(5);
      expect(result[0].bucket).toBe("0-30 days");
      expect(result[1].bucket).toBe("30-60 days");
      expect(result[2].bucket).toBe("60-90 days");
      expect(result[3].bucket).toBe("90-180 days");
      expect(result[4].bucket).toBe("180+ days");
    });

    it("counts licenses in correct expiration buckets", async () => {
      const now = new Date();
      const future15 = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
      const future45 = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000);

      findManyMock.mockResolvedValueOnce([
        { expiresAt: future15 },
        { expiresAt: future45 },
      ]);

      const result = await getLicenseExpirationData(orgId);
      expect(result[0].count).toBe(1); // 0-30 days
      expect(result[1].count).toBe(1); // 30-60 days
    });
  });

  describe("getUsageCostData", () => {
    it("returns empty array when no billing plan exists", async () => {
      findUniqueMock.mockResolvedValueOnce(null);
      const result = await getUsageCostData(orgId, 30);
      expect(result).toEqual([]);
    });

    it("returns empty array when no usage events exist", async () => {
      findUniqueMock.mockResolvedValueOnce({
        platformFeeCents: 10000,
        unitPriceCredentialing: 5000,
        unitPriceLicense: 3000,
        unitPriceEnrollment: 4000,
        unitPriceMonitoring: 2000,
      });
      findManyMock.mockResolvedValueOnce([]);

      const result = await getUsageCostData(orgId, 30);
      expect(result).toBeArray();
    });
  });

  describe("getEnrollmentVelocityData", () => {
    it("returns empty array when no enrollments exist", async () => {
      findManyMock.mockResolvedValueOnce([]);
      const result = await getEnrollmentVelocityData(orgId);
      expect(result).toEqual([]);
    });

    it("calculates approval rate and days to approval", async () => {
      const submittedAt = new Date("2026-01-01");
      const approvedAt = new Date("2026-01-15");

      findManyMock.mockResolvedValueOnce([
        {
          payer: "Medicare",
          status: "APPROVED",
          submittedAt,
          updatedAt: approvedAt,
        },
      ]);

      const result = await getEnrollmentVelocityData(orgId);
      expect(result).toBeArray();
      expect(result.length).toBe(1);
      expect(result[0].payer).toBe("Medicare");
      expect(result[0].approvalRate).toBe(100);
      expect(result[0].avgDaysToApproval).toBe(14);
    });
  });
});
