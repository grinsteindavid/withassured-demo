import { NextResponse } from "next/server";
import { getSubscription, createSubscription } from "@/lib/payments";
import { withRole } from "@/lib/route-guard";

export const GET = withRole(
  async (_request, user) => {
    const subscription = await getSubscription(user.orgId);
    if (!subscription) {
      return NextResponse.json(null);
    }

    return NextResponse.json(subscription);
  },
  ["ADMIN"],
);

export const POST = withRole(
  async (request, user) => {
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
  },
  ["ADMIN"],
);
