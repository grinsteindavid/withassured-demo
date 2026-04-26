import { listComplianceWorkflows, getComplianceWorkflowDetail } from "@/lib/compliance";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { WorkflowTimeline } from "@/components/dashboard/workflow-timeline";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { formatDate } from "@/lib/format";
import { WorkflowHeartbeat } from "@/components/dashboard/workflow-heartbeat";

interface CompliancePageProps {
  searchParams: Promise<{ check?: string; result?: string; source?: string; providerId?: string }>;
}

export default async function CompliancePage({ searchParams }: CompliancePageProps) {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  const { check: selectedCheckId, result, source, providerId } = await searchParams;
  const filters = {
    result,
    source,
    providerId,
  };
  const workflows = await listComplianceWorkflows(user.orgId, filters);
  const detail = selectedCheckId ? await getComplianceWorkflowDetail(selectedCheckId, user.orgId) : null;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Compliance Monitoring</h1>

      <div className="grid grid-cols-12 gap-6">
        <aside className="col-span-12 md:col-span-5 lg:col-span-4">
          {workflows.length === 0 ? (
            <div className="rounded border p-6 text-gray-600">
              No compliance checks with active workflows.
            </div>
          ) : (
            <ul data-testid="compliance-list" className="divide-y rounded border bg-white">
              {workflows.map((w) => {
                const isSelected = w.id === selectedCheckId;
                return (
                  <li key={w.id}>
                    <a
                      data-testid={`compliance-${w.id}`}
                      href={`/dashboard/compliance?check=${w.id}${result ? `&result=${result}` : ""}${source ? `&source=${source}` : ""}${providerId ? `&providerId=${providerId}` : ""}`}
                      className={`block p-3 hover:bg-gray-50 ${isSelected ? "bg-gray-100" : ""}`}
                    >
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="truncate font-medium">{w.providerName}</span>
                        <StatusBadge status={w.result === "CLEAN" ? "ACTIVE" : "REVOKED"} />
                      </div>
                      <div className="text-sm text-gray-600">
                        {w.source} · {w.result} · Checked {formatDate(w.checkedAt)}
                      </div>
                      {w.currentStep && (
                        <div className="mt-1 text-xs text-gray-500">
                          Step: {w.currentStep}
                        </div>
                      )}
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        {workflows.length > 0 && (
          <section className="col-span-12 md:col-span-7 lg:col-span-8">
            {detail ? (
              <div data-testid="compliance-detail">
                <WorkflowHeartbeat />
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold">{detail.providerName}</h2>
                    <p className="text-sm text-gray-600">
                      {detail.providerSpecialty} · {detail.source} Check
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Result: {detail.result} · Checked {formatDate(detail.checkedAt)} · Workflow {detail.workflowId} · started {formatDate(detail.startTime)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={detail.result === "CLEAN" ? "ACTIVE" : "REVOKED"} />
                    <StatusBadge status={detail.workflowStatus} />
                  </div>
                </div>
                <WorkflowTimeline steps={detail.steps} />
              </div>
            ) : (
              <div className="rounded border p-6 text-gray-600">
                Select a compliance check on the left to see the workflow timeline.
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
