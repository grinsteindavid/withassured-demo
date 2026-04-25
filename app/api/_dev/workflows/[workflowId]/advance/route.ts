import { NextResponse } from "next/server";
import { controls } from "@/lib/temporal/client";

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
