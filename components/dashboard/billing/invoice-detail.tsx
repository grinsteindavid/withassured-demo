"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/format";

export function InvoiceDetail({
  invoice,
  paymentMethods,
}: {
  invoice: {
    id: string;
    periodStart: string;
    periodEnd: string;
    subtotalCents: number;
    totalCents: number;
    status: string;
    lineItems: Array<{ description: string; amount: number; quantity: number }>;
  };
  paymentMethods: Array<{ id: string; last4: string; type: string }>;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("");

  const handlePay = async () => {
    if (!selectedPaymentMethod) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/billing/invoices/${invoice.id}/pay-with-method`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethodId: selectedPaymentMethod }),
      });

      if (res.ok) {
        router.refresh();
      } else {
        console.error("Failed to pay invoice");
      }
    } catch (error) {
      console.error("Error paying invoice:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    // Mock PDF download
    const link = document.createElement("a");
    link.href = "#";
    link.download = `invoice-${invoice.id}.pdf`;
    link.click();
  };

  const formatCents = (cents: number) => {
    return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">Invoice {invoice.id}</h3>
          <p className="text-sm text-muted-foreground">
            {formatDate(invoice.periodStart)} - {formatDate(invoice.periodEnd)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={invoice.status} />
          <Button variant="outline" size="sm" onClick={handleDownload}>
            Download PDF
          </Button>
        </div>
      </div>

      <div className="space-y-4 mb-6">
        {invoice.lineItems.map((item, index) => (
          <div key={index} className="flex justify-between items-center py-2 border-b">
            <div className="flex-1">
              <p className="font-medium">{item.description}</p>
              <p className="text-sm text-muted-foreground">Quantity: {item.quantity}</p>
            </div>
            <p className="font-medium">{formatCents(item.amount)}</p>
          </div>
        ))}
      </div>

      <div className="space-y-2 pt-4 border-t">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span>{formatCents(invoice.subtotalCents)}</span>
        </div>
        <div className="flex justify-between text-lg font-bold">
          <span>Total</span>
          <span>{formatCents(invoice.totalCents)}</span>
        </div>
      </div>

      {invoice.status === "OPEN" && paymentMethods.length > 0 && (
        <div className="mt-6 pt-6 border-t">
          <h4 className="font-semibold mb-3">Pay with Saved Card</h4>
          <div className="flex gap-3">
            <select
              value={selectedPaymentMethod}
              onChange={(e) => setSelectedPaymentMethod(e.target.value)}
              className="flex-1 p-2 border rounded"
            >
              <option value="">Select payment method</option>
              {paymentMethods.map((pm) => (
                <option key={pm.id} value={pm.id}>
                  {pm.type === "card" ? "Card" : "ACH"} •••• {pm.last4}
                </option>
              ))}
            </select>
            <Button onClick={handlePay} disabled={loading || !selectedPaymentMethod}>
              {loading ? "Processing..." : "Pay Now"}
            </Button>
          </div>
        </div>
      )}

      {invoice.status === "OPEN" && paymentMethods.length === 0 && (
        <div className="mt-6 pt-6 border-t text-sm text-muted-foreground">
          Add a payment method to pay this invoice.
        </div>
      )}
    </Card>
  );
}
