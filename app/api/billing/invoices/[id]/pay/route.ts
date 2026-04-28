import { NextResponse } from "next/server";
import { processInvoicePayment, getInvoiceById } from "@/lib/billing";
import { getSessionUser } from "@/lib/auth";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const invoice = await getInvoiceById(id, user.orgId);
  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const result = await processInvoicePayment(id);

  if (!result.success) {
    const status = result.error === "Invoice not found" ? 404 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ success: true, paymentIntentId: result.paymentIntentId });
}
