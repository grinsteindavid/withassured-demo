import { NextResponse } from "next/server";
import { processInvoicePayment } from "@/lib/billing";
import { withRoleParams } from "@/lib/route-guard";

export const POST = withRoleParams(
  async (request, params, user) => {
    const id = (await params).id as string;
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
  },
  ["ADMIN"],
);
