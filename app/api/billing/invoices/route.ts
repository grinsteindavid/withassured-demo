import { NextResponse } from "next/server";
import { listAllInvoices } from "@/lib/billing";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await listAllInvoices(user.orgId));
}
