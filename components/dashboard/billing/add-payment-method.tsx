"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useRouter } from "next/navigation";

export function AddPaymentMethod() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: "CARD" as "CARD" | "ACH",
    last4: "",
    expiryMonth: "",
    expiryYear: "",
    brand: "",
    setDefault: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/payments/methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        router.push("/dashboard/billing");
        router.refresh();
      } else {
        console.error("Failed to add payment method");
      }
    } catch (error) {
      console.error("Error adding payment method:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push("/dashboard/billing");
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Add Payment Method</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Type</label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value as "CARD" | "ACH" })}
            className="w-full p-2 border rounded"
          >
            <option value="CARD">Credit Card</option>
            <option value="ACH">Bank Account (ACH)</option>
          </select>
        </div>

        {formData.type === "CARD" && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">Card Number (last 4)</label>
              <input
                type="text"
                maxLength={4}
                value={formData.last4}
                onChange={(e) => setFormData({ ...formData, last4: e.target.value })}
                className="w-full p-2 border rounded"
                placeholder="••••"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Brand (optional)</label>
              <select
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                className="w-full p-2 border rounded"
              >
                <option value="">Select brand</option>
                <option value="Visa">Visa</option>
                <option value="Mastercard">Mastercard</option>
                <option value="Amex">American Express</option>
                <option value="Discover">Discover</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Expiry Month</label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={formData.expiryMonth}
                  onChange={(e) => setFormData({ ...formData, expiryMonth: e.target.value })}
                  className="w-full p-2 border rounded"
                  placeholder="MM"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Expiry Year</label>
                <input
                  type="number"
                  min={new Date().getFullYear()}
                  value={formData.expiryYear}
                  onChange={(e) => setFormData({ ...formData, expiryYear: e.target.value })}
                  className="w-full p-2 border rounded"
                  placeholder="YYYY"
                  required
                />
              </div>
            </div>
          </>
        )}

        {formData.type === "ACH" && (
          <div>
            <label className="block text-sm font-medium mb-1">Account Number (last 4)</label>
            <input
              type="text"
              maxLength={4}
              value={formData.last4}
              onChange={(e) => setFormData({ ...formData, last4: e.target.value })}
              className="w-full p-2 border rounded"
              placeholder="••••"
              required
            />
          </div>
        )}

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="setDefault"
            checked={formData.setDefault}
            onChange={(e) => setFormData({ ...formData, setDefault: e.target.checked })}
          />
          <label htmlFor="setDefault" className="text-sm">Set as default payment method</label>
        </div>

        <div className="flex gap-2 pt-4">
          <Button type="button" variant="outline" onClick={handleCancel} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Adding..." : "Add Payment Method"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
