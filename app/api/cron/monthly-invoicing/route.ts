import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateMonthlyInvoice } from "@/lib/payments";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const subscriptions = await (prisma as any).subscription.findMany({
      where: {
        status: "ACTIVE",
      },
    });

    const results = await Promise.allSettled(
      subscriptions.map(async (sub: { orgId: string }) => {
        await generateMonthlyInvoice(sub.orgId);
        return { orgId: sub.orgId, success: true };
      })
    );

    const successful = results.filter((r: PromiseSettledResult<any>) => r.status === "fulfilled").length;
    const failed = results.filter((r: PromiseSettledResult<any>) => r.status === "rejected").length;

    return NextResponse.json({
      processed: subscriptions.length,
      successful,
      failed,
    });
  } catch (error) {
    console.error("Monthly invoicing error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
