import { NextResponse } from "next/server";
import { getWorkflowState } from "@/lib/workflows";
import { getSessionUser } from "@/lib/auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ workflowId: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workflowId } = await params;

  try {
    const state = await getWorkflowState(workflowId);
    return NextResponse.json(state);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 404 },
    );
  }
}
