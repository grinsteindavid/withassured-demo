import { NextResponse } from "next/server";
import { getCurrentUsage } from "@/lib/billing";
import { billingUsageQuerySchema } from "@/lib/validators";
import { withAuth } from "@/lib/route-guard";

export const GET = withAuth(async (request, user) => {
  const { searchParams } = new URL(request.url);
  const result = billingUsageQuerySchema.safeParse(Object.fromEntries(searchParams));

  if (!result.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const usage = await getCurrentUsage(result.data.period, user.orgId);
  return NextResponse.json(usage);
});
