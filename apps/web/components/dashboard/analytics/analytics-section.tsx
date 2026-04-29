import { TimeToRevenueChart } from "./time-to-revenue-chart";
import { WorkflowSuccessChart } from "./workflow-success-chart";
import { LicenseExpirationChart } from "./license-expiration-chart";
import { UsageCostChart } from "./usage-cost-chart";
import { DateRangeSelector } from "./date-range-selector";
import {
  getTimeToRevenueData,
  getWorkflowSuccessRates,
  getLicenseExpirationData,
  getUsageCostData,
} from "@/lib/analytics";

interface AnalyticsSectionProps {
  orgId: string;
  days: number;
}

export async function AnalyticsSection({ orgId, days }: AnalyticsSectionProps) {
  const [timeToRevenueData, workflowSuccessData, licenseExpirationData, usageCostData] =
    await Promise.all([
      getTimeToRevenueData(orgId, days),
      getWorkflowSuccessRates(orgId),
      getLicenseExpirationData(orgId),
      getUsageCostData(orgId, days),
    ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Analytics</h2>
        <DateRangeSelector currentDays={days} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded border p-4">
          <h3 className="mb-4 text-sm font-medium text-gray-500">Time to Revenue</h3>
          <TimeToRevenueChart data={timeToRevenueData} />
        </div>

        <div className="rounded border p-4">
          <h3 className="mb-4 text-sm font-medium text-gray-500">Workflow Success Rates</h3>
          <WorkflowSuccessChart data={workflowSuccessData} />
        </div>

        <div className="rounded border p-4">
          <h3 className="mb-4 text-sm font-medium text-gray-500">License Expiration Timeline</h3>
          <LicenseExpirationChart data={licenseExpirationData} />
        </div>

        <div className="rounded border p-4">
          <h3 className="mb-4 text-sm font-medium text-gray-500">Usage Cost by Product Line</h3>
          <UsageCostChart data={usageCostData} />
        </div>

      </div>
    </div>
  );
}
