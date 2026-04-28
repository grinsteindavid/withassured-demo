"use client";

import { useEffect, useState } from "react";
import { WorkflowTimeline } from "@/components/dashboard/workflow-timeline";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { formatDate } from "@/lib/format";
import type { WorkflowStep } from "@/lib/workflow/types";

interface Enrollment {
  id: string;
  providerId: string;
  payer: string;
  state: string;
  status: string;
  submittedAt: string | null;
  workflowId: string | null;
}

interface EnrollmentRowProps {
  enrollment: Enrollment;
  providerName?: string;
}

export function EnrollmentRow({ enrollment, providerName }: EnrollmentRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [workflow, setWorkflow] = useState<{ steps: WorkflowStep[] } | null>(null);
  const [loading, setLoading] = useState(false);

  // Poll when expanded to refresh timeline
  useEffect(() => {
    if (!expanded || !enrollment.workflowId) return;

    async function poll() {
      const res = await fetch(`/api/workflows/${enrollment.workflowId}`);
      if (res.ok) {
        const data = await res.json();
        setWorkflow({ steps: data.steps || [] });
      }
    }

    poll();
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [expanded, enrollment.workflowId]);

  async function toggle() {
    if (!enrollment.workflowId) return;

    if (!expanded) {
      if (!workflow) {
        setLoading(true);
        try {
          const res = await fetch(`/api/workflows/${enrollment.workflowId}`);
          if (res.ok) {
            const data = await res.json();
            setWorkflow({ steps: data.steps || [] });
          }
        } finally {
          setLoading(false);
        }
      }
      setExpanded(true);
    } else {
      setExpanded(false);
    }
  }

  return (
    <>
      <tr className="border-b hover:bg-gray-50">
        <td className="px-4 py-2">{providerName || enrollment.providerId}</td>
        <td className="px-4 py-2">{enrollment.payer}</td>
        <td className="px-4 py-2">{enrollment.state}</td>
        <td className="px-4 py-2">
          <StatusBadge status={enrollment.status} />
        </td>
        <td className="px-4 py-2">
          {enrollment.submittedAt ? formatDate(enrollment.submittedAt) : "—"}
        </td>
        <td className="px-4 py-2">
          {enrollment.workflowId ? (
            <button
              onClick={toggle}
              className="text-sm text-blue-600 hover:underline"
            >
              {expanded ? "Hide" : "View"} Workflow
            </button>
          ) : (
            <span className="text-sm text-gray-400">—</span>
          )}
        </td>
      </tr>
      {expanded && enrollment.workflowId && (
        <tr>
          <td colSpan={6} className="px-4 py-4 bg-gray-50">
            {loading ? (
              <p className="text-sm text-gray-500">Loading workflow...</p>
            ) : workflow ? (
              <WorkflowTimeline steps={workflow.steps} />
            ) : (
              <p className="text-sm text-gray-500">Failed to load workflow.</p>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
