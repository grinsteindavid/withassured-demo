import { NextResponse } from "next/server";
import { listPayerEnrollments, createPayerEnrollment } from "@/lib/enrollment";
import { withSubscription } from "@/lib/route-guard";
import { createPayerEnrollmentSchema } from "@/lib/validators";

export const GET = withSubscription(async (_request, user) => {
  const enrollments = await listPayerEnrollments(user.orgId);
  return NextResponse.json(enrollments);
});

export const POST = withSubscription(async (request, user) => {
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
});
