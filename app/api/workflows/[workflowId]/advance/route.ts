import { NextResponse } from "next/server";
import { controls } from "@/lib/temporal/client";

// Dev-only: advances a mocked Temporal workflow by one step.
// In production this returns 404 — real workflows progress via Temporal worker
// activity completions, not button clicks.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ workflowId: string }> },
) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { workflowId } = await params;
  controls.advance(workflowId);
  return new NextResponse(null, { status: 204 });
}
