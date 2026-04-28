import { listPayerEnrollments, listProviders } from "@/lib/enrollment";
import { getSessionUser } from "@/lib/auth";
import { getSubscription } from "@/lib/payments";
import { DataTable } from "@/components/dashboard/data-table";
import { EnrollmentRow } from "@/components/dashboard/enrollment/enrollment-row";
import { WorkflowHeartbeat } from "@/components/dashboard/workflow-heartbeat";
import { AddPayerEnrollmentDialog } from "@/components/dashboard/enrollment/add-payer-enrollment-dialog";

export default async function EnrollmentPage() {
  const user = await getSessionUser();

  const [enrollments, providers, subscription] = await Promise.all([
    listPayerEnrollments(user!.orgId),
    listProviders(user!.orgId),
    getSubscription(user!.orgId),
  ]);
  const providerMap = new Map(providers.map((p) => [p.id, p.name] as [string, string]));

  const total = enrollments.length;
  const approved = enrollments.filter((e) => e.status === "APPROVED").length;
  const pending = enrollments.filter((e) => e.status === "PENDING").length;
  const denied = enrollments.filter((e) => e.status === "DENIED").length;

  return (
    <>
      <WorkflowHeartbeat />
      <div>
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Payer Enrollment</h1>
          <AddPayerEnrollmentDialog subscription={subscription} providers={providers} />
        </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded border p-4">
          <p className="text-sm text-gray-500">Total Enrollments</p>
          <p className="text-2xl font-bold">{total}</p>
        </div>
        <div className="rounded border p-4">
          <p className="text-sm text-gray-500">Approved</p>
          <p className="text-2xl font-bold text-green-700">{approved}</p>
        </div>
        <div className="rounded border p-4">
          <p className="text-sm text-gray-500">Pending</p>
          <p className="text-2xl font-bold text-yellow-700">{pending}</p>
        </div>
        <div className="rounded border p-4">
          <p className="text-sm text-gray-500">Denied</p>
          <p className="text-2xl font-bold text-red-700">{denied}</p>
        </div>
      </div>

      <DataTable columns={["Provider", "Payer", "State", "Status", "Submitted", "Workflow"]}>
        {enrollments.map((enrollment) => (
          <EnrollmentRow
            key={enrollment.id}
            enrollment={{
              ...enrollment,
              submittedAt: enrollment.submittedAt ? enrollment.submittedAt.toISOString() : null,
            }}
            providerName={providerMap.get(enrollment.providerId)}
          />
        ))}
      </DataTable>
    </div>
    </>
  );
}
