import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { PRICING } from "@/lib/billing";

export async function POST(request: Request) {
  const body = await request.json();
  const { type, providerId } = body;

  const unitCents = {
    CREDENTIALING: PRICING.unitPriceCredentialing,
    LICENSE: PRICING.unitPriceLicense,
    ENROLLMENT: PRICING.unitPriceEnrollment,
    MONITORING: PRICING.unitPriceMonitoring,
  }[type] || 0;

  const event = await prisma.usageEvent.create({
    data: {
      orgId: "org_1",
      type,
      providerId,
      unitCents,
    },
  });

  return NextResponse.json(event, { status: 201 });
}
