import { InvoiceDetail } from "@/components/dashboard/billing/invoice-detail";
import { getInvoiceById } from "@/lib/billing";
import { listPaymentMethods } from "@/lib/payments";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  const { id } = await params;
  const [invoice, paymentMethods] = await Promise.all([
    getInvoiceById(id, user.orgId).catch(() => null),
    listPaymentMethods(user.orgId).catch(() => []),
  ]);

  if (!invoice) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold">Invoice Not Found</h1>
        <div className="rounded border p-4 text-gray-600">
          Invoice {id} not found.{" "}
          <Link href="/dashboard/billing" className="text-blue-600 hover:underline">
            Return to billing
          </Link>
        </div>
      </div>
    );
  }

  const formattedInvoice = {
    id: invoice.id,
    periodStart: invoice.periodStart instanceof Date ? invoice.periodStart.toISOString() : invoice.periodStart as string,
    periodEnd: invoice.periodEnd instanceof Date ? invoice.periodEnd.toISOString() : invoice.periodEnd as string,
    subtotalCents: invoice.subtotalCents,
    totalCents: invoice.totalCents,
    status: invoice.status as string,
    lineItems: Array.isArray(invoice.lineItems)
      ? invoice.lineItems.map((item: unknown) => {
          const lineItem = item as { description?: string; amount?: number; quantity?: number };
          return {
            description: lineItem.description || "",
            amount: lineItem.amount || 0,
            quantity: lineItem.quantity || 1,
          };
        })
      : [],
  };

  const formattedPaymentMethods = paymentMethods.map((pm) => ({
    id: pm.id,
    last4: pm.last4,
    type: pm.type,
  }));

  return (
    <div>
      <div className="mb-6">
        <Link href="/dashboard/billing" className="text-sm text-muted-foreground hover:underline">
          ← Back to Billing
        </Link>
      </div>
      <InvoiceDetail invoice={formattedInvoice} paymentMethods={formattedPaymentMethods} />
    </div>
  );
}
