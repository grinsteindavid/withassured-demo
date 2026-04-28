import { UsageCards } from "@/components/dashboard/billing/usage-cards";
import { InvoiceTable } from "@/components/dashboard/billing/invoice-table";
import { PayButton } from "@/components/dashboard/billing/pay-button";
import { PaymentMethods } from "@/components/dashboard/billing/payment-methods";
import { SubscriptionCard } from "@/components/dashboard/billing/subscription-card";
import { getCurrentUsage, listAllInvoices } from "@/lib/billing";
import { listPaymentMethods, getSubscription } from "@/lib/payments";
import { getSessionUser } from "@/lib/auth";

export default async function BillingPage() {
  const user = await getSessionUser();

  const [usage, invoices, paymentMethods, subscription] = await Promise.all([
    getCurrentUsage("current", user!.orgId).catch(() => null),
    listAllInvoices(user!.orgId).catch(() => [] as Awaited<ReturnType<typeof listAllInvoices>>),
    listPaymentMethods(user!.orgId).catch(() => []),
    getSubscription(user!.orgId).catch(() => null),
  ]);

  const openInvoice = invoices.find(
    (inv) => inv.status === "OPEN" || (inv.status as string) === "open",
  );

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Billing</h1>

      <div className="grid gap-6 mb-8 md:grid-cols-2">
        <SubscriptionCard subscription={subscription} />
        <PaymentMethods methods={paymentMethods} />
      </div>

      {usage ? (
        <div className="mb-8">
          <UsageCards
            lines={usage.lines}
            platformFeeCents={usage.platformFeeCents}
            totalCents={usage.totalCents}
          />

          {openInvoice && (
            <div className="mt-4 flex items-center gap-4">
              <PayButton invoiceId={openInvoice.id} />
            </div>
          )}
        </div>
      ) : (
        <div className="mb-8 rounded border p-4 text-gray-600">Unable to load usage data.</div>
      )}

      <div>
        <h2 className="mb-4 text-lg font-semibold">Invoice History</h2>
        {invoices.length > 0 ? (
          <InvoiceTable
            invoices={invoices.map((inv) => ({
              id: inv.id,
              periodStart: inv.periodStart instanceof Date ? inv.periodStart.toISOString() : inv.periodStart as string,
              periodEnd: inv.periodEnd instanceof Date ? inv.periodEnd.toISOString() : inv.periodEnd as string,
              subtotalCents: inv.subtotalCents,
              totalCents: inv.totalCents,
              status: inv.status as string,
            }))}
          />
        ) : (
          <div className="rounded border p-4 text-gray-600">No invoices yet.</div>
        )}
      </div>
    </div>
  );
}
