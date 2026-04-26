import { StatusBadge } from "@/components/dashboard/status-badge";
import { DataTable } from "@/components/dashboard/data-table";
import { formatDate } from "@/lib/format";
import type { ProviderDetail } from "@/lib/providers";

interface ProviderDetailProps {
  provider: ProviderDetail;
}

export function ProviderDetail({ provider }: ProviderDetailProps) {
  return (
    <div className="rounded border p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold">{provider.name}</h2>
        <p className="text-sm text-gray-600">
          NPI: {provider.npi} · {provider.specialty}
        </p>
        <p className="mt-1 text-xs text-gray-500">
          Status: <StatusBadge status={provider.status} /> · Added {formatDate(provider.createdAt)}
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="mb-3 font-medium">Licenses ({provider.licenseCount})</h3>
          {provider.licenses.length === 0 ? (
            <p className="text-sm text-gray-500">No licenses on file.</p>
          ) : (
            <DataTable columns={["State", "Number", "Expires", "Status"]}>
              {provider.licenses.map((license) => (
                <tr key={license.id} className="border-b">
                  <td className="px-4 py-2">{license.state}</td>
                  <td className="px-4 py-2">{license.number}</td>
                  <td className="px-4 py-2">{formatDate(license.expiresAt)}</td>
                  <td className="px-4 py-2">
                    <StatusBadge status={license.status} />
                  </td>
                </tr>
              ))}
            </DataTable>
          )}
        </div>

        <div>
          <h3 className="mb-3 font-medium">Payer Enrollments ({provider.enrollmentCount})</h3>
          {provider.enrollments.length === 0 ? (
            <p className="text-sm text-gray-500">No payer enrollments.</p>
          ) : (
            <DataTable columns={["Payer", "State", "Status", "Submitted"]}>
              {provider.enrollments.map((enrollment) => (
                <tr key={enrollment.id} className="border-b">
                  <td className="px-4 py-2">{enrollment.payer}</td>
                  <td className="px-4 py-2">{enrollment.state}</td>
                  <td className="px-4 py-2">
                    <StatusBadge status={enrollment.status} />
                  </td>
                  <td className="px-4 py-2">
                    {enrollment.submittedAt ? formatDate(enrollment.submittedAt) : "—"}
                  </td>
                </tr>
              ))}
            </DataTable>
          )}
        </div>

        <div>
          <h3 className="mb-3 font-medium">Compliance Checks</h3>
          {provider.complianceChecks.length === 0 ? (
            <p className="text-sm text-gray-500">No compliance checks.</p>
          ) : (
            <DataTable columns={["Source", "Result", "Checked"]}>
              {provider.complianceChecks.map((check) => (
                <tr key={check.id} className="border-b">
                  <td className="px-4 py-2">{check.source}</td>
                  <td className="px-4 py-2">
                    {check.result === "FLAG" ? (
                      <span className="inline-flex rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-800">
                        FLAG
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                        CLEAN
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2">{formatDate(check.checkedAt)}</td>
                </tr>
              ))}
            </DataTable>
          )}
        </div>
      </div>
    </div>
  );
}
