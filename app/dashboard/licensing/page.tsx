import { listLicenses, getLicenseDetail } from "@/lib/licenses";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { WorkflowTimeline } from "@/components/dashboard/workflow-timeline";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { formatDate } from "@/lib/format";
import { WorkflowHeartbeat } from "@/components/dashboard/workflow-heartbeat";
import { LicenseFilters } from "@/components/dashboard/licensing/license-filters";
import type { LicenseStatus } from "@prisma/client";

interface LicensingPageProps {
  searchParams: Promise<{ license?: string; status?: string; state?: string; expiringInDays?: string }>;
}

export default async function LicensingPage({ searchParams }: LicensingPageProps) {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  const { license: selectedLicenseId, status, state, expiringInDays } = await searchParams;
  const filters = {
    status: status as LicenseStatus | undefined,
    state,
    expiringInDays: expiringInDays ? parseInt(expiringInDays, 10) : undefined,
  };
  const licenses = await listLicenses(user.orgId, filters);
  const detail = selectedLicenseId ? await getLicenseDetail(selectedLicenseId, user.orgId) : null;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">License Management</h1>

      <div className="grid grid-cols-12 gap-6">
        <aside className="col-span-12 md:col-span-5 lg:col-span-4">
          <LicenseFilters
            currentStatus={status}
            currentState={state}
            currentExpiringInDays={expiringInDays}
          />
          {licenses.length === 0 ? (
            <div className="rounded border p-6 text-gray-600">
              No licenses with active workflows. Add a provider and create a license application.
            </div>
          ) : (
            <ul data-testid="license-list" className="divide-y rounded border bg-white">
              {licenses.map((l) => {
                const isSelected = l.id === selectedLicenseId;
                return (
                  <li key={l.id}>
                    <a
                      data-testid={`license-${l.id}`}
                      href={`/dashboard/licensing?license=${l.id}${status ? `&status=${status}` : ""}${state ? `&state=${state}` : ""}${expiringInDays ? `&expiringInDays=${expiringInDays}` : ""}`}
                      className={`block p-3 hover:bg-gray-50 ${isSelected ? "bg-gray-100" : ""}`}
                    >
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="truncate font-medium">{l.providerName}</span>
                        <StatusBadge status={l.status} />
                      </div>
                      <div className="text-sm text-gray-600">
                        {l.state} · {l.number} · Expires {formatDate(l.expiresAt)}
                      </div>
                      {l.currentStep && (
                        <div className="mt-1 text-xs text-gray-500">
                          Step: {l.currentStep}
                        </div>
                      )}
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        {licenses.length > 0 && (
          <section className="col-span-12 md:col-span-7 lg:col-span-8">
            {detail ? (
              <div data-testid="license-detail">
                <WorkflowHeartbeat />
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold">{detail.providerName}</h2>
                    <p className="text-sm text-gray-600">
                      {detail.providerSpecialty} · {detail.state} License {detail.number}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Expires {formatDate(detail.expiresAt)} · Workflow {detail.workflowId} · started {formatDate(detail.startTime)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={detail.status} />
                    <StatusBadge status={detail.workflowStatus} />
                  </div>
                </div>
                <WorkflowTimeline steps={detail.steps} />
              </div>
            ) : (
              <div className="rounded border p-6 text-gray-600">
                Select a license on the left to see the workflow timeline.
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
