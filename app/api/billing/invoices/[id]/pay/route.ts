import { NextResponse } from "next/server";
import { processInvoicePayment } from "@/lib/billing";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const result = await processInvoicePayment(id);

  if (!result.success) {
    const status = result.error === "Invoice not found" ? 404 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ success: true, paymentIntentId: result.paymentIntentId });
}
