"use client";

import { useRouter, useSearchParams } from "next/navigation";

interface LicenseFiltersProps {
  currentStatus?: string;
  currentState?: string;
  currentExpiringInDays?: string;
}

export function LicenseFilters({ currentStatus, currentState, currentExpiringInDays }: LicenseFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    
    router.push(`/dashboard/licensing?${params.toString()}`);
  };

  return (
    <div className="mb-4 space-y-2">
      <a
        href="/dashboard/licensing"
        className="block text-sm font-medium text-gray-700 hover:text-gray-900"
      >
        Clear filters
      </a>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="State (e.g., CA)"
          defaultValue={currentState}
          onChange={(e) => updateFilter("state", e.target.value)}
          onBlur={(e) => updateFilter("state", e.target.value)}
          className="w-full rounded border px-3 py-1.5 text-sm"
        />
        <input
          type="number"
          placeholder="Expiring in days"
          defaultValue={currentExpiringInDays}
          onChange={(e) => updateFilter("expiringInDays", e.target.value)}
          onBlur={(e) => updateFilter("expiringInDays", e.target.value)}
          className="w-full rounded border px-3 py-1.5 text-sm"
        />
      </div>
      <select
        defaultValue={currentStatus}
        onChange={(e) => updateFilter("status", e.target.value)}
        className="w-full rounded border px-3 py-1.5 text-sm"
      >
        <option value="">All Statuses</option>
        <option value="ACTIVE">Active</option>
        <option value="EXPIRED">Expired</option>
        <option value="PENDING">Pending</option>
        <option value="REVOKED">Revoked</option>
      </select>
    </div>
  );
}
