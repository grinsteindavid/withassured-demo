import { NextResponse } from "next/server";
import { getInvoiceById } from "@/lib/billing";
import { getSessionUser } from "@/lib/auth";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const invoice = await getInvoiceById(id, user.orgId);
  if (!invoice) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(invoice);
}
