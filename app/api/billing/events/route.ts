import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { PRICING } from "@/lib/billing";
import { createMeterEvent } from "@/lib/stripe-mock";

const VALID_TYPES = ["CREDENTIALING", "LICENSE", "ENROLLMENT", "MONITORING"] as const;

export async function POST(request: Request) {
  const body = await request.json() as { type?: string; providerId?: string };
  const { type, providerId } = body;

  if (!type || !VALID_TYPES.includes(type as typeof VALID_TYPES[number])) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  const unitCentsMap: Record<string, number> = {
    CREDENTIALING: PRICING.unitPriceCredentialing,
    LICENSE: PRICING.unitPriceLicense,
    ENROLLMENT: PRICING.unitPriceEnrollment,
    MONITORING: PRICING.unitPriceMonitoring,
  };
  const unitCents = unitCentsMap[type] || 0;

  const event = await prisma.usageEvent.create({
    data: {
      orgId: "org_1",
      type: type as "CREDENTIALING" | "LICENSE" | "ENROLLMENT" | "MONITORING",
      providerId,
      unitCents,
    },
  });

  createMeterEvent({
    event_name: type.toLowerCase(),
    customer: "org_1",
    value: 1,
  });

  return NextResponse.json(event, { status: 201 });
}
