import { NextResponse } from "next/server";
import { cancelSubscription } from "@/lib/payments";
import { withRole } from "@/lib/route-guard";

export const POST = withRole(
  async (_request, user) => {
    const subscription = await cancelSubscription(user.orgId);
    if (!subscription) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    return NextResponse.json(subscription);
  },
  ["ADMIN"],
);
