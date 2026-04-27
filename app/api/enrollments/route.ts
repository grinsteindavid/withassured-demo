import { NextResponse } from "next/server";
import { listPayerEnrollments } from "@/lib/enrollment";
import { getSessionUser } from "@/lib/auth";
import { requireActiveSubscription, subscriptionBlockedResponse } from "@/lib/subscription-guard";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hasSubscription = await requireActiveSubscription(user.orgId);
  if (!hasSubscription) {
    return subscriptionBlockedResponse();
  }

  const enrollments = await listPayerEnrollments(user.orgId);
  return NextResponse.json(enrollments);
}
