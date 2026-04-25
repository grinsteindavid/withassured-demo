import { mockTemporal } from "@/lib/temporal/client";
import { currentStep, fullStepList } from "@/lib/temporal/derive";

export async function getWorkflowState(workflowId: string) {
  const handle = mockTemporal.workflow.getHandle(workflowId);
  const [info, history] = await Promise.all([handle.describe(), handle.fetchHistory()]);

  return {
    workflowId: info.workflowId,
    runId: info.runId,
    type: info.type,
    status: info.status.name,
    currentStep: currentStep(history.events),
    steps: fullStepList(history.events, info.type),
    startTime: info.startTime,
    closeTime: info.closeTime,
  };
}
