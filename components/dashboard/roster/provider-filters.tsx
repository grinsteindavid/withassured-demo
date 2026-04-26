"use client";

import { useRouter, useSearchParams } from "next/navigation";

interface ProviderFiltersProps {
  currentStatus?: string;
  currentSpecialty?: string;
  currentSearch?: string;
}

export function ProviderFilters({ currentStatus, currentSpecialty, currentSearch }: ProviderFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    
    router.push(`/dashboard/roster?${params.toString()}`);
  };

  return (
    <div className="mb-4 space-y-2">
      <a
        href="/dashboard/roster"
        className="block text-sm font-medium text-gray-700 hover:text-gray-900"
      >
        Clear filters
      </a>
      <input
        type="text"
        placeholder="Search by name or NPI"
        defaultValue={currentSearch}
        onChange={(e) => updateFilter("search", e.target.value)}
        onBlur={(e) => updateFilter("search", e.target.value)}
        className="w-full rounded border px-3 py-1.5 text-sm"
      />
      <select
        defaultValue={currentStatus}
        onChange={(e) => updateFilter("status", e.target.value)}
        className="w-full rounded border px-3 py-1.5 text-sm"
      >
        <option value="">All Statuses</option>
        <option value="ACTIVE">Active</option>
        <option value="INACTIVE">Inactive</option>
        <option value="PENDING">Pending</option>
      </select>
      <input
        type="text"
        placeholder="Specialty (e.g., Cardiology)"
        defaultValue={currentSpecialty}
        onChange={(e) => updateFilter("specialty", e.target.value)}
        onBlur={(e) => updateFilter("specialty", e.target.value)}
        className="w-full rounded border px-3 py-1.5 text-sm"
      />
    </div>
  );
}
