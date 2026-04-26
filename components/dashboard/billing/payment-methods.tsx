"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { PaymentMethodDetails } from "@/lib/stripe-mock";

export function PaymentMethods({
  methods,
}: {
  methods: PaymentMethodDetails[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const handleSetDefault = async (id: string) => {
    setLoading(id);
    try {
      const res = await fetch(`/api/payments/methods/${id}/default`, {
        method: "POST",
      });
      if (res.ok) {
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to set default payment method:", error);
    } finally {
      setLoading(null);
    }
  };

  const handleRemove = async (id: string) => {
    setLoading(id);
    try {
      const res = await fetch(`/api/payments/methods/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to remove payment method:", error);
    } finally {
      setLoading(null);
    }
  };

  const handleAdd = () => {
    router.push("/dashboard/billing/add-payment-method");
  };

  if (methods.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Payment Methods</h3>
            <p className="text-sm text-muted-foreground">No payment methods saved</p>
          </div>
          <Button onClick={handleAdd}>Add Payment Method</Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Payment Methods</h3>
        <Button onClick={handleAdd} size="sm">
          Add Payment Method
        </Button>
      </div>
      <div className="space-y-3">
        {methods.map((method) => (
          <div
            key={method.id}
            className="flex items-center justify-between p-4 border rounded-lg"
          >
            <div className="flex items-center gap-3">
              <div>
                <p className="font-medium">
                  {method.type === "card" ? "Card" : "ACH"} •••• {method.last4}
                </p>
                {method.type === "card" && method.brand && (
                  <p className="text-sm text-muted-foreground">{method.brand}</p>
                )}
                {method.type === "card" && (
                  <p className="text-sm text-muted-foreground">
                    Expires {method.expiryMonth}/{method.expiryYear}
                  </p>
                )}
              </div>
              {method.isDefault && <Badge variant="secondary">Default</Badge>}
            </div>
            <div className="flex items-center gap-2">
              {!method.isDefault && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSetDefault(method.id)}
                  disabled={loading === method.id}
                >
                  {loading === method.id ? "Setting..." : "Set Default"}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemove(method.id)}
                disabled={loading === method.id}
                className="text-destructive hover:text-destructive"
              >
                {loading === method.id ? "Removing..." : "Remove"}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
