import { NextResponse } from "next/server";
import { listAllInvoices } from "@/lib/billing";
import { withAuth } from "@/lib/route-guard";

export const GET = withAuth(async (_request, user) => {
  return NextResponse.json(await listAllInvoices(user.orgId));
});
