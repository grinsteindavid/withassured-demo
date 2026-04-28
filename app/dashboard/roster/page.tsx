import { getSessionUser } from "@/lib/auth";
import { listProviders, getProviderDetail } from "@/lib/providers";
import { getSubscription } from "@/lib/payments";
import { ProviderFilters } from "@/components/dashboard/roster/provider-filters";
import { ProviderRow } from "@/components/dashboard/roster/provider-row";
import { ProviderDetail } from "@/components/dashboard/roster/provider-detail";
import { AddProviderDialog } from "@/components/dashboard/roster/add-provider-dialog";
import { DataTable } from "@/components/dashboard/data-table";

interface RosterPageProps {
  searchParams: Promise<{ provider?: string; status?: string; specialty?: string; search?: string }>;
}

export default async function RosterPage({ searchParams }: RosterPageProps) {
  const user = await getSessionUser();

  const { provider: selectedProviderId, status, specialty, search } = await searchParams;
  const filters = {
    status: status as "ACTIVE" | "INACTIVE" | "PENDING" | undefined,
    specialty,
    search,
  };
  const providers = await listProviders(user!.orgId, filters);
  const detail = selectedProviderId ? await getProviderDetail(selectedProviderId, user!.orgId) : null;
  const subscription = await getSubscription(user!.orgId);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Provider Roster</h1>
        <AddProviderDialog subscription={subscription} />
      </div>

      <div className="grid grid-cols-12 gap-6">
        <aside className="col-span-12 md:col-span-5 lg:col-span-4">
          <ProviderFilters
            currentStatus={status}
            currentSpecialty={specialty}
            currentSearch={search}
          />
          {providers.length === 0 ? (
            <div className="rounded border p-6 text-gray-600">
              No providers found. Try adjusting your filters.
            </div>
          ) : (
            <DataTable columns={["Name", "NPI", "Specialty", "Status", "Licenses", "Enrollments", "Compliance", "Added"]}>
              {providers.map((provider) => (
                <ProviderRow
                  key={provider.id}
                  provider={provider}
                  status={status}
                  specialty={specialty}
                  search={search}
                />
              ))}
            </DataTable>
          )}
        </aside>

        {providers.length > 0 && (
          <section className="col-span-12 md:col-span-7 lg:col-span-8">
            {detail ? (
              <ProviderDetail provider={detail} />
            ) : (
              <div className="rounded border p-6 text-gray-600">
                Select a provider to view their details.
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
