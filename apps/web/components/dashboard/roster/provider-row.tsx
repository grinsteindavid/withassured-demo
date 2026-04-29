import { StatusBadge } from "@/components/dashboard/status-badge";
import { formatDate } from "@/lib/format";

interface ProviderSummary {
  id: string;
  npi: string;
  name: string;
  specialty: string;
  status: string;
  licenseCount: number;
  enrollmentCount: number;
  hasComplianceFlag: boolean;
  createdAt: Date;
}

interface ProviderRowProps {
  provider: ProviderSummary;
  status?: string;
  specialty?: string;
  search?: string;
}

export function ProviderRow({ provider, status, specialty, search }: ProviderRowProps) {
  const buildUrl = () => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (specialty) params.set("specialty", specialty);
    if (search) params.set("search", search);
    params.set("provider", provider.id);
    return `/dashboard/roster?${params.toString()}`;
  };

  return (
    <tr className="border-b hover:bg-gray-50">
      <td className="px-4 py-2">
        <a href={buildUrl()} className="font-medium text-blue-600 hover:underline">
          {provider.name}
        </a>
      </td>
      <td className="px-4 py-2">{provider.npi}</td>
      <td className="px-4 py-2">{provider.specialty}</td>
      <td className="px-4 py-2">
        <StatusBadge status={provider.status} />
      </td>
      <td className="px-4 py-2">{provider.licenseCount}</td>
      <td className="px-4 py-2">{provider.enrollmentCount}</td>
      <td className="px-4 py-2">
        {provider.hasComplianceFlag ? (
          <span className="inline-flex rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-800">
            FLAG
          </span>
        ) : (
          <span className="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
            CLEAN
          </span>
        )}
      </td>
      <td className="px-4 py-2">{formatDate(provider.createdAt)}</td>
    </tr>
  );
}
