import { NextResponse } from "next/server";
import { getComplianceChecks } from "@/lib/compliance";
import { complianceQuerySchema } from "@/lib/validators";
import { withSubscription } from "@/lib/route-guard";

export const GET = withSubscription(async (request, user) => {
  const { searchParams } = new URL(request.url);
  const result = complianceQuerySchema.safeParse(Object.fromEntries(searchParams));

  if (!result.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const checks = await getComplianceChecks(user.orgId, result.data.providerId);
  return NextResponse.json(checks);
});
