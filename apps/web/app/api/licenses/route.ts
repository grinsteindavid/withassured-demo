import { NextResponse } from "next/server";
import { listLicenses } from "@/lib/licenses";
import { licenseQuerySchema } from "@/lib/validators";
import { withSubscription } from "@/lib/route-guard";

export const GET = withSubscription(async (request, user) => {
  const { searchParams } = new URL(request.url);
  const result = licenseQuerySchema.safeParse(Object.fromEntries(searchParams));

  if (!result.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const licenses = await listLicenses(user.orgId, result.data);
  return NextResponse.json(licenses);
});
