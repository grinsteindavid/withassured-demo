import { UsageCards } from "@/components/dashboard/billing/usage-cards";
import { InvoiceTable } from "@/components/dashboard/billing/invoice-table";
import { PayButton } from "@/components/dashboard/billing/pay-button";
import { getCurrentUsage, listAllInvoices } from "@/lib/billing";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function BillingPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  const [usage, invoices] = await Promise.all([
    getCurrentUsage("current", user.orgId).catch(() => null),
    listAllInvoices(user.orgId).catch(() => [] as Awaited<ReturnType<typeof listAllInvoices>>),
  ]);

  const openInvoice = invoices.find(
    (inv) => inv.status === "OPEN" || (inv.status as string) === "open",
  );

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Billing</h1>

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
          <InvoiceTable invoices={invoices} />
        ) : (
          <div className="rounded border p-4 text-gray-600">No invoices yet.</div>
        )}
      </div>
    </div>
  );
}
