import { NextResponse } from "next/server";
import { listLicenses } from "@/lib/licenses";
import { licenseQuerySchema } from "@/lib/validators";
import { getSessionUser } from "@/lib/auth";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const result = licenseQuerySchema.safeParse(Object.fromEntries(searchParams));

  if (!result.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const licenses = await listLicenses(user.orgId, result.data);
  return NextResponse.json(licenses);
}
