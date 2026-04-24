import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { complianceQuerySchema } from "@/lib/validators";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const result = complianceQuerySchema.safeParse(Object.fromEntries(searchParams));

  if (!result.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { providerId } = result.data;

  const where = providerId ? { providerId } : {};

  const checks = await prisma.complianceCheck.findMany({ where });
  return NextResponse.json(checks);
}
