import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { licenseQuerySchema } from "@/lib/validators";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const result = licenseQuerySchema.safeParse(Object.fromEntries(searchParams));

  if (!result.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { expiringInDays } = result.data;

  const where = expiringInDays
    ? {
        expiresAt: {
          lte: new Date(Date.now() + expiringInDays * 24 * 60 * 60 * 1000),
        },
      }
    : {};

  const licenses = await prisma.license.findMany({ where });
  return NextResponse.json(licenses);
}
