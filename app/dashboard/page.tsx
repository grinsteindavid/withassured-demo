import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardOverview() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  const orgId = user.orgId;

  const [totalProviders, activeCredentials, pendingEnrollments, complianceAlerts] = await Promise.all([
    prisma.provider.count({ where: { orgId } }),
    prisma.credentialingCase.count({
      where: {
        provider: { orgId },
        status: "COMPLETED",
      },
    }),
    prisma.payerEnrollment.count({
      where: {
        provider: { orgId },
        status: "PENDING",
      },
    }),
    prisma.complianceCheck.count({
      where: {
        provider: { orgId },
        result: "FLAG",
      },
    }),
  ]);

  return (
    <div>
      <h1 data-testid="dashboard-heading" className="mb-6 text-2xl font-bold">Dashboard Overview</h1>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded border p-4">
          <h3 className="text-sm font-medium text-gray-500">Total Providers</h3>
          <p className="text-2xl font-bold">{totalProviders}</p>
        </div>
        <div className="rounded border p-4">
          <h3 className="text-sm font-medium text-gray-500">Active Credentials</h3>
          <p className="text-2xl font-bold">{activeCredentials}</p>
        </div>
        <div className="rounded border p-4">
          <h3 className="text-sm font-medium text-gray-500">Pending Enrollments</h3>
          <p className="text-2xl font-bold">{pendingEnrollments}</p>
        </div>
        <div className="rounded border p-4">
          <h3 className="text-sm font-medium text-gray-500">Compliance Alerts</h3>
          <p className="text-2xl font-bold">{complianceAlerts}</p>
        </div>
      </div>
    </div>
  );
}
