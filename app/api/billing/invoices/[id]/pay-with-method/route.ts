import { NextResponse } from "next/server";
import { processInvoicePayment } from "@/lib/billing";
import { getSessionUser } from "@/lib/auth";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { paymentMethodId } = body;

  if (!paymentMethodId) {
    return NextResponse.json({ error: "Payment method ID required" }, { status: 400 });
  }

  try {
    const result = await processInvoicePayment(id, paymentMethodId);
    if (!result) {
      return NextResponse.json({ error: "Invoice not found or already paid" }, { status: 404 });
    }
    return NextResponse.json({ success: true, invoice: result });
  } catch (_error) {
    return NextResponse.json({ error: "Failed to process payment" }, { status: 500 });
  }
}
