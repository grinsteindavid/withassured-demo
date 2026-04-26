import { NextResponse } from "next/server";
import { getSubscription, createSubscription } from "@/lib/payments";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const subscription = await getSubscription(user.orgId);
  if (!subscription) {
    return NextResponse.json(null);
  }

  return NextResponse.json(subscription);
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { plan } = body;

  if (!plan || !["STARTUP", "GROWTH", "ENTERPRISE"].includes(plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  try {
    const subscription = await createSubscription(user.orgId, plan as "STARTUP" | "GROWTH" | "ENTERPRISE");
    return NextResponse.json(subscription);
  } catch (error) {
    console.error("Subscription creation error:", error);
    return NextResponse.json({ error: "Failed to create subscription" }, { status: 500 });
  }
}
