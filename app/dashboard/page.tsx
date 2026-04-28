import { getDashboardMetrics } from "@/lib/enrollment";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AnalyticsSection } from "@/components/dashboard/analytics/analytics-section";
import { WorkflowHeartbeat } from "@/components/dashboard/workflow-heartbeat";

export default async function DashboardOverview({ searchParams }: { searchParams: { days?: string } }) {
  const user = await getSessionUser();
  const org = await prisma.organization.findUnique({
    where: { id: user!.orgId },
    select: { name: true },
  });

  const { totalProviders, activeCredentials, pendingEnrollments, complianceAlerts, expiredLicenses } = await getDashboardMetrics(user!.orgId);
  const days = searchParams.days ? parseInt(searchParams.days, 10) : 90;

  return (
    <div>
      <WorkflowHeartbeat />
      <h1 data-testid="dashboard-heading" className="mb-6 text-2xl font-bold">
        {org?.name ?? "Dashboard"} Overview
      </h1>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        <div className="rounded border p-4" data-testid="metric-total-providers">
          <h3 className="text-sm font-medium text-gray-500">Total Providers</h3>
          <p className="text-2xl font-bold">{totalProviders}</p>
        </div>
        <div className="rounded border p-4" data-testid="metric-active-credentials">
          <h3 className="text-sm font-medium text-gray-500">Active Credentials</h3>
          <p className="text-2xl font-bold">{activeCredentials}</p>
        </div>
        <div className="rounded border p-4" data-testid="metric-pending-enrollments">
          <h3 className="text-sm font-medium text-gray-500">Pending Enrollments</h3>
          <p className="text-2xl font-bold">{pendingEnrollments}</p>
        </div>
        <div className="rounded border p-4" data-testid="metric-compliance-alerts">
          <h3 className="text-sm font-medium text-gray-500">Compliance Alerts</h3>
          <p className="text-2xl font-bold">{complianceAlerts}</p>
        </div>
        <div className="rounded border p-4" data-testid="metric-expired-licenses">
          <h3 className="text-sm font-medium text-gray-500">Expired Licenses</h3>
          <p className="text-2xl font-bold">{expiredLicenses}</p>
        </div>
      </div>

      <AnalyticsSection orgId={user!.orgId} days={days} />
    </div>
  );
}
