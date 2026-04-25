import { NextResponse } from "next/server";
import { recordUsageEvent, isValidUsageType } from "@/lib/billing";

export async function POST(request: Request) {
  const body = (await request.json()) as { type?: string; providerId?: string };
  const { type, providerId } = body;

  if (!type || !isValidUsageType(type)) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  const event = await recordUsageEvent(type, providerId);
  return NextResponse.json(event, { status: 201 });
}
