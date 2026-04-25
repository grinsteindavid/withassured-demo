import { NextResponse } from "next/server";
import { getCurrentUsage } from "@/lib/billing";
import { billingUsageQuerySchema } from "@/lib/validators";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const result = billingUsageQuerySchema.safeParse(Object.fromEntries(searchParams));

  if (!result.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const usage = await getCurrentUsage(result.data.period);
  return NextResponse.json(usage);
}
