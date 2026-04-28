import { describe, it, expect, mock, beforeEach } from "bun:test";

const getTimeToRevenueDataMock = mock(async () => [] as any[]);
const getWorkflowSuccessRatesMock = mock(async () => [] as any[]);
const getLicenseExpirationDataMock = mock(async () => [] as any[]);
const getUsageCostDataMock = mock(async () => [] as any[]);
const getEnrollmentVelocityDataMock = mock(async () => [] as any[]);

mock.module("@/lib/analytics", () => ({
  getTimeToRevenueData: getTimeToRevenueDataMock,
  getWorkflowSuccessRates: getWorkflowSuccessRatesMock,
  getLicenseExpirationData: getLicenseExpirationDataMock,
  getUsageCostData: getUsageCostDataMock,
  getEnrollmentVelocityData: getEnrollmentVelocityDataMock,
}));

mock.module("@/components/dashboard/analytics/date-range-selector", () => ({
  DateRangeSelector: () => <div>DateRangeSelector</div>,
}));

const { AnalyticsSection } = await import("./analytics-section");

beforeEach(() => {
  getTimeToRevenueDataMock.mockClear();
  getWorkflowSuccessRatesMock.mockClear();
  getLicenseExpirationDataMock.mockClear();
  getUsageCostDataMock.mockClear();
  getEnrollmentVelocityDataMock.mockClear();
});

describe("<AnalyticsSection />", () => {
  it("renders analytics section with charts", async () => {
    getTimeToRevenueDataMock.mockResolvedValueOnce([
      { month: "2026-01", completed: 5, baseline: 2 },
    ] as any[]);
    getWorkflowSuccessRatesMock.mockResolvedValueOnce([
      { workflowType: "Credentialing", completed: 10, failed: 2, inProgress: 3 },
    ] as any[]);
    getLicenseExpirationDataMock.mockResolvedValueOnce([
      { bucket: "0-30 days", count: 5 },
    ] as any[]);
    getUsageCostDataMock.mockResolvedValueOnce([
      { month: "2026-01", credentialing: 19900, licensing: 9900, enrollment: 14900, monitoring: 2900 },
    ] as any[]);
    getEnrollmentVelocityDataMock.mockResolvedValueOnce([
      { payer: "Medicare", approvalRate: 95, avgDaysToApproval: 14 },
    ] as any[]);

    const result = await AnalyticsSection({ orgId: "org_1", days: 30 });
    expect(result).toBeTruthy();
  });

  it("calls all analytics functions with correct parameters", async () => {
    getTimeToRevenueDataMock.mockResolvedValueOnce([]);
    getWorkflowSuccessRatesMock.mockResolvedValueOnce([]);
    getLicenseExpirationDataMock.mockResolvedValueOnce([]);
    getUsageCostDataMock.mockResolvedValueOnce([]);
    getEnrollmentVelocityDataMock.mockResolvedValueOnce([]);

    await AnalyticsSection({ orgId: "org_1", days: 90 });

    expect(getTimeToRevenueDataMock).toHaveBeenCalledWith("org_1", 90);
    expect(getWorkflowSuccessRatesMock).toHaveBeenCalledWith("org_1");
    expect(getLicenseExpirationDataMock).toHaveBeenCalledWith("org_1");
    expect(getUsageCostDataMock).toHaveBeenCalledWith("org_1", 90);
    expect(getEnrollmentVelocityDataMock).toHaveBeenCalledWith("org_1");
  });
});
