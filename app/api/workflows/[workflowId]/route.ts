import { NextResponse } from "next/server";
import { mockTemporal } from "@/lib/temporal/client";
import { currentStep, fullStepList } from "@/lib/temporal/derive";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ workflowId: string }> },
) {
  const { workflowId } = await params;

  try {
    const handle = mockTemporal.workflow.getHandle(workflowId);
    const [info, history] = await Promise.all([handle.describe(), handle.fetchHistory()]);

    return NextResponse.json({
      workflowId: info.workflowId,
      runId: info.runId,
      type: info.type,
      status: info.status.name,
      currentStep: currentStep(history.events),
      steps: fullStepList(history.events, info.type),
      startTime: info.startTime,
      closeTime: info.closeTime,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 404 },
    );
  }
}
