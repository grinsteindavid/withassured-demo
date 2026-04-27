import { NextResponse } from "next/server";
import { listPayerEnrollments, createPayerEnrollment } from "@/lib/enrollment";
import { getSessionUser } from "@/lib/auth";
import { requireActiveSubscription, subscriptionBlockedResponse } from "@/lib/subscription-guard";
import { createPayerEnrollmentSchema } from "@/lib/validators";

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

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hasSubscription = await requireActiveSubscription(user.orgId);
  if (!hasSubscription) {
    return subscriptionBlockedResponse();
  }

  const body = await request.json();
  const result = createPayerEnrollmentSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  try {
    const enrollment = await createPayerEnrollment(result.data, user.orgId);
    return NextResponse.json(enrollment, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create enrollment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
