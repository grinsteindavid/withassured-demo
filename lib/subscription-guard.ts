import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function requireActiveSubscription(orgId: string): Promise<boolean> {
  const subscription = await (prisma as any).subscription.findUnique({
    where: { orgId },
  });
  return subscription?.status === "ACTIVE";
}

export function subscriptionBlockedResponse(): NextResponse {
  return NextResponse.json(
    { error: "Subscription required. Please subscribe to access this feature." },
    { status: 403 },
  );
}
