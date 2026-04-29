import { NextResponse } from "next/server";
import { getInvoiceById } from "@/lib/billing";
import { withAuthParams } from "@/lib/route-guard";

export const GET = withAuthParams(
  async (_request, params, user) => {
    const id = (await params).id as string;
    const invoice = await getInvoiceById(id, user.orgId);
    if (!invoice) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(invoice);
  },
);
