import { NextResponse } from "next/server";
import { processInvoicePayment, getInvoiceById } from "@/lib/billing";
import { withAuthParams } from "@/lib/route-guard";

export const POST = withAuthParams(
  async (_request, params, user) => {
    const id = (await params).id as string;

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
  },
);
