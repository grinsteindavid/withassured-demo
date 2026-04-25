"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface AdvanceButtonProps {
  workflowId: string;
}

export function AdvanceButton({ workflowId }: AdvanceButtonProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    setBusy(true);
    try {
      await fetch(`/api/workflows/${workflowId}/advance`, { method: "POST" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      data-testid="advance-button"
      onClick={handleClick}
      disabled={busy}
      className="rounded border bg-white px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-50"
    >
      {busy ? "Advancing…" : "Advance step"}
    </button>
  );
}
