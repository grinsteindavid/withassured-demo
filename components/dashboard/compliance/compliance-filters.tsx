"use client";

import { useRouter, useSearchParams } from "next/navigation";

interface ComplianceFiltersProps {
  providers: Array<{ id: string; name: string }>;
  currentProviderId?: string;
  currentResult?: string;
  currentSource?: string;
}

export function ComplianceFilters({ providers, currentProviderId, currentResult, currentSource }: ComplianceFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    
    router.push(`/dashboard/compliance?${params.toString()}`);
  };

  return (
    <div className="mb-4 space-y-2">
      <a
        href="/dashboard/compliance"
        className="block text-sm font-medium text-gray-700 hover:text-gray-900"
      >
        Clear filters
      </a>
      <select
        defaultValue={currentProviderId}
        onChange={(e) => updateFilter("providerId", e.target.value)}
        className="w-full rounded border px-3 py-1.5 text-sm"
      >
        <option value="">All Providers</option>
        {providers.map((provider) => (
          <option key={provider.id} value={provider.id}>
            {provider.name}
          </option>
        ))}
      </select>
      <select
        defaultValue={currentResult}
        onChange={(e) => updateFilter("result", e.target.value)}
        className="w-full rounded border px-3 py-1.5 text-sm"
      >
        <option value="">All Results</option>
        <option value="CLEAN">Clean</option>
        <option value="FLAG">Flag</option>
      </select>
      <select
        defaultValue={currentSource}
        onChange={(e) => updateFilter("source", e.target.value)}
        className="w-full rounded border px-3 py-1.5 text-sm"
      >
        <option value="">All Sources</option>
        <option value="OIG">OIG</option>
        <option value="SAM">SAM</option>
        <option value="NPDB">NPDB</option>
      </select>
    </div>
  );
}
