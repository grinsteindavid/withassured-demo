import { NextResponse } from "next/server";
import { getWorkflow } from "@/lib/temporal-mock";

export async function GET(request: Request, { params }: { params: { workflowId: string } }) {
  const { workflowId } = params;
  const workflow = getWorkflow(workflowId);
  return NextResponse.json(workflow);
}
