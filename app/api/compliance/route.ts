import { NextResponse } from "next/server";
import { getComplianceChecks } from "@/lib/compliance";
import { getSessionUser } from "@/lib/auth";
import { complianceQuerySchema } from "@/lib/validators";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const result = complianceQuerySchema.safeParse(Object.fromEntries(searchParams));

  if (!result.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const checks = await getComplianceChecks(user.orgId, result.data.providerId);
  return NextResponse.json(checks);
}
