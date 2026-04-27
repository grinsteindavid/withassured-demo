import { NextResponse } from "next/server";
import { getInvoiceById } from "@/lib/billing";
import { getSessionUser } from "@/lib/auth";
import { generateInvoicePdf } from "@/lib/pdf-invoice";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const invoice = await getInvoiceById(id, user.orgId);
  if (!invoice) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const org = await prisma.organization.findUnique({
    where: { id: user.orgId },
    select: { name: true },
  });

  const orgName = org?.name ?? "Organization";

  const lineItems = Array.isArray(invoice.lineItems)
    ? invoice.lineItems.map((item: unknown) => {
        const line = item as {
          description?: string;
          amount?: number;
          quantity?: number;
        };
        return {
          description: line.description ?? "",
          amount: line.amount ?? 0,
          quantity: line.quantity ?? 1,
        };
      })
    : [];

  const pdfBytes = await generateInvoicePdf(
    {
      id: invoice.id,
      periodStart: invoice.periodStart,
      periodEnd: invoice.periodEnd,
      subtotalCents: invoice.subtotalCents,
      totalCents: invoice.totalCents,
      status: invoice.status,
      lineItems,
    },
    orgName,
  );

  const url = new URL(_request.url);
  const isDownload = url.searchParams.get("download") === "1";

  const body = new Uint8Array(pdfBytes);
  const headers: Record<string, string> = {
    "Content-Type": "application/pdf",
  };
  if (isDownload) {
    headers["Content-Disposition"] = `attachment; filename="invoice-${id}.pdf"`;
  }

  return new Response(body, {
    status: 200,
    headers,
  });
}
