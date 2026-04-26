import { NextResponse } from "next/server";
import { getCurrentUsage } from "@/lib/billing";
import { getSessionUser } from "@/lib/auth";
import { billingUsageQuerySchema } from "@/lib/validators";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const result = billingUsageQuerySchema.safeParse(Object.fromEntries(searchParams));

  if (!result.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const usage = await getCurrentUsage(result.data.period, user.orgId);
  return NextResponse.json(usage);
}
