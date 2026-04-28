import { NextResponse } from "next/server";
import { recordUsageEvent } from "@/lib/billing";
import { isValidUsageType } from "@/lib/billing-formulas";
import { getSessionUser } from "@/lib/auth";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { type?: string; providerId?: string };
  const { type, providerId } = body;

  if (!type || !isValidUsageType(type)) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  const event = await recordUsageEvent(type, user.orgId, providerId);
  return NextResponse.json(event, { status: 201 });
}
