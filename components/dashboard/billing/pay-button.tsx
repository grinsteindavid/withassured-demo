"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface PayButtonProps {
  invoiceId: string;
}

export function PayButton({ invoiceId }: PayButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handlePay() {
    setLoading(true);
    try {
      const res = await fetch(`/api/billing/invoices/${invoiceId}/pay`, {
        method: "POST",
      });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handlePay}
      disabled={loading}
      className="rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
    >
      {loading ? "Processing..." : "Pay"}
    </button>
  );
}
