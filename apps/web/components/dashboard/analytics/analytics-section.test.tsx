import { describe, it, expect, mock, beforeEach, afterAll } from "bun:test";

import * as RealDateRangeSelector from "@/components/dashboard/analytics/date-range-selector";
const realDateRangeSelector = { ...RealDateRangeSelector };

const getTimeToRevenueDataMock = mock(async () => [] as any[]);
const getWorkflowSuccessRatesMock = mock(async () => [] as any[]);
const getLicenseExpirationDataMock = mock(async () => [] as any[]);
const getUsageCostDataMock = mock(async () => [] as any[]);

mock.module("@/lib/analytics", () => ({
  getTimeToRevenueData: getTimeToRevenueDataMock,
  getWorkflowSuccessRates: getWorkflowSuccessRatesMock,
  getLicenseExpirationData: getLicenseExpirationDataMock,
  getUsageCostData: getUsageCostDataMock,
}));

mock.module("@/components/dashboard/analytics/date-range-selector", () => ({
  DateRangeSelector: () => <div>DateRangeSelector</div>,
}));

// Restore the real module so date-range-selector.test.tsx (which runs later
// alphabetically) sees the real component. See docs/testing.md pitfall #3.
afterAll(() => {
  mock.module("@/components/dashboard/analytics/date-range-selector", () => realDateRangeSelector);
});

const { AnalyticsSection } = await import("./analytics-section");

beforeEach(() => {
  getTimeToRevenueDataMock.mockClear();
  getWorkflowSuccessRatesMock.mockClear();
  getLicenseExpirationDataMock.mockClear();
  getUsageCostDataMock.mockClear();
});

describe("<AnalyticsSection />", () => {
  it("calls all analytics functions with correct parameters", async () => {
    getTimeToRevenueDataMock.mockResolvedValueOnce([]);
    getWorkflowSuccessRatesMock.mockResolvedValueOnce([]);
    getLicenseExpirationDataMock.mockResolvedValueOnce([]);
    getUsageCostDataMock.mockResolvedValueOnce([]);

    await AnalyticsSection({ orgId: "org_1", days: 90 });

    expect(getTimeToRevenueDataMock).toHaveBeenCalledWith("org_1", 90);
    expect(getWorkflowSuccessRatesMock).toHaveBeenCalledWith("org_1");
    expect(getLicenseExpirationDataMock).toHaveBeenCalledWith("org_1");
    expect(getUsageCostDataMock).toHaveBeenCalledWith("org_1", 90);
  });
});
