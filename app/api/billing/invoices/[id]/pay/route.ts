import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { payInvoice } from "@/lib/stripe-mock";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const mockResult = payInvoice(id);
  if (mockResult) {
    await prisma.invoice.updateMany({
      where: { id },
      data: { status: "PAID" },
    });
    return NextResponse.json({ success: true, paymentIntentId: mockResult.paymentIntentId });
  }

  const dbInvoice = await prisma.invoice.findUnique({ where: { id } });
  if (!dbInvoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  if (dbInvoice.status === "PAID") {
    return NextResponse.json({ error: "Already paid" }, { status: 400 });
  }

  await prisma.invoice.update({
    where: { id },
    data: { status: "PAID" },
  });

  return NextResponse.json({ success: true, paymentIntentId: `pi_${id}` });
}
