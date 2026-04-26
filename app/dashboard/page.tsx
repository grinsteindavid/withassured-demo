import { getDashboardMetrics } from "@/lib/enrollment";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

export default async function DashboardOverview() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  const org = await prisma.organization.findUnique({
    where: { id: user.orgId },
    select: { name: true },
  });

  const { totalProviders, activeCredentials, pendingEnrollments, complianceAlerts } = await getDashboardMetrics(user.orgId);

  return (
    <div>
      <h1 data-testid="dashboard-heading" className="mb-6 text-2xl font-bold">
        {org?.name ?? "Dashboard"} Overview
      </h1>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
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
      </div>
    </div>
  );
}
