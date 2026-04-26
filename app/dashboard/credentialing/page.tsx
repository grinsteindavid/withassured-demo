import { listCredentialingCases, getCredentialingCaseDetail } from "@/lib/credentialing";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { WorkflowTimeline } from "@/components/dashboard/workflow-timeline";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { AdvanceButton } from "@/components/dashboard/credentialing/advance-button";
import { formatDate } from "@/lib/format";

interface CredentialingPageProps {
  searchParams: Promise<{ provider?: string }>;
}

export default async function CredentialingPage({ searchParams }: CredentialingPageProps) {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  const { provider: selectedProviderId } = await searchParams;
  const cases = await listCredentialingCases(user.orgId);
  const detail = selectedProviderId ? await getCredentialingCaseDetail(selectedProviderId, user.orgId) : null;

  const showAdvance = process.env.NODE_ENV !== "production";

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Provider Credentialing</h1>

      {cases.length === 0 ? (
        <div className="rounded border p-6 text-gray-600">
          No credentialing cases yet. Add a provider and seed a case.
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-6">
          <aside className="col-span-12 md:col-span-5 lg:col-span-4">
            <ul data-testid="credentialing-list" className="divide-y rounded border bg-white">
              {cases.map((c) => {
                const isSelected = c.providerId === selectedProviderId;
                return (
                  <li key={c.providerId}>
                    <a
                      data-testid={`credentialing-case-${c.providerId}`}
                      href={`/dashboard/credentialing?provider=${c.providerId}`}
                      className={`block p-3 hover:bg-gray-50 ${isSelected ? "bg-gray-100" : ""}`}
                    >
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="truncate font-medium">{c.providerName}</span>
                        <StatusBadge status={c.status} />
                      </div>
                      <div className="text-sm text-gray-600">
                        {c.specialty} · {c.currentStep ?? "—"}
                      </div>
                    </a>
                  </li>
                );
              })}
            </ul>
          </aside>

          <section className="col-span-12 md:col-span-7 lg:col-span-8">
            {detail ? (
              <div data-testid="credentialing-detail">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold">{detail.providerName}</h2>
                    <p className="text-sm text-gray-600">
                      {detail.specialty} · NPI {detail.npi}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Workflow {detail.workflowId} · started {formatDate(detail.startTime)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={detail.status} />
                    {showAdvance && detail.status === "RUNNING" && (
                      <AdvanceButton workflowId={detail.workflowId} />
                    )}
                  </div>
                </div>
                <WorkflowTimeline steps={detail.steps} />
              </div>
            ) : (
              <div className="rounded border p-6 text-gray-600">
                Select a provider on the left to see their credentialing workflow.
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
