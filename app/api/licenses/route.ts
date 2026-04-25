import { NextResponse } from "next/server";
import { getLicenses } from "@/lib/licenses";
import { licenseQuerySchema } from "@/lib/validators";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const result = licenseQuerySchema.safeParse(Object.fromEntries(searchParams));

  if (!result.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const licenses = await getLicenses(result.data.expiringInDays);
  return NextResponse.json(licenses);
}
