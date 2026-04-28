import { NextResponse } from "next/server";
import { withAuth } from "@/lib/route-guard";

export const GET = withAuth((_request, user) => {
  return NextResponse.json({ userId: user.userId, orgId: user.orgId, role: user.role });
});
