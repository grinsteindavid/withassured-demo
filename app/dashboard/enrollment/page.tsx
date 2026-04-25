import { prisma } from "@/lib/db";
import { DataTable } from "@/components/dashboard/data-table";
import { EnrollmentRow } from "@/components/dashboard/enrollment/enrollment-row";

export default async function EnrollmentPage() {
  const [enrollments, providers] = await Promise.all([
    prisma.payerEnrollment.findMany(),
    prisma.provider.findMany({ select: { id: true, name: true } }),
  ]);
  const providerMap = new Map(providers.map((p) => [p.id, p.name] as [string, string]));

  const total = enrollments.length;
  const approved = enrollments.filter((e) => e.status === "APPROVED").length;
  const pending = enrollments.filter((e) => e.status === "PENDING").length;
  const denied = enrollments.filter((e) => e.status === "DENIED").length;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Payer Enrollment</h1>

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
  );
}
