import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rollupUsage, PRICING } from "@/lib/billing";
import { billingUsageQuerySchema } from "@/lib/validators";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const result = billingUsageQuerySchema.safeParse(Object.fromEntries(searchParams));

  if (!result.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { period } = result.data;
  const now = new Date();
  const periodStart = period === "current" ? new Date(now.getFullYear(), now.getMonth(), 1) : new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const periodEnd = period === "current" ? new Date(now.getFullYear(), now.getMonth() + 1, 0) : new Date(now.getFullYear(), now.getMonth(), 0);

  const events = await prisma.usageEvent.findMany({
    where: {
      occurredAt: { gte: periodStart, lte: periodEnd },
      invoiceId: null,
    },
  });

  const rollup = rollupUsage({
    platformFeeCents: PRICING.platformFeeCents,
    events: events.map((e) => ({ type: e.type, unitCents: e.unitCents })),
  });

  return NextResponse.json({
    periodStart,
    periodEnd,
    ...rollup,
  });
}
