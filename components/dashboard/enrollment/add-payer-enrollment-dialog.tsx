"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Subscription } from "@/lib/stripe-mock";

interface ProviderOption {
  id: string;
  name: string;
}

interface AddPayerEnrollmentDialogProps {
  subscription?: Subscription | null;
  providers: ProviderOption[];
}

export function AddPayerEnrollmentDialog({
  subscription,
  providers,
}: AddPayerEnrollmentDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    providerId: "",
    payer: "",
    state: "",
    submittedAt: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload: Record<string, string> = {
      providerId: formData.providerId,
      payer: formData.payer,
      state: formData.state,
    };
    if (formData.submittedAt) {
      payload.submittedAt = new Date(formData.submittedAt).toISOString();
    }

    try {
      const res = await fetch("/api/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setOpen(false);
        setFormData({
          providerId: "",
          payer: "",
          state: "",
          submittedAt: "",
        });
        router.refresh();
      } else {
        const body = await res.json().catch(() => ({ error: "Unknown error" }));
        setError(body.error || "Failed to add enrollment");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  };

  const isActive = subscription?.status === "ACTIVE";

  if (!isActive) {
    return (
      <a href="/dashboard/billing" className={cn(buttonVariants({ variant: "default" }))}>
        Subscribe to add enrollments
      </a>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <span className={cn(buttonVariants({ variant: "default" }))}>
          Add Payer Enrollment
        </span>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Payer Enrollment</DialogTitle>
          <DialogDescription>
            Select a provider and enter payer enrollment details.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Provider</label>
            <select
              value={formData.providerId}
              onChange={(e) =>
                setFormData({ ...formData, providerId: e.target.value })
              }
              className="w-full p-2 border rounded"
              required
            >
              <option value="">Select a provider</option>
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Payer</label>
            <input
              type="text"
              value={formData.payer}
              onChange={(e) =>
                setFormData({ ...formData, payer: e.target.value })
              }
              className="w-full p-2 border rounded"
              placeholder="Blue Cross"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">State</label>
            <input
              type="text"
              value={formData.state}
              onChange={(e) =>
                setFormData({ ...formData, state: e.target.value })
              }
              className="w-full p-2 border rounded"
              placeholder="CA"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Submitted Date (optional)
            </label>
            <input
              type="date"
              value={formData.submittedAt}
              onChange={(e) =>
                setFormData({ ...formData, submittedAt: e.target.value })
              }
              className="w-full p-2 border rounded"
            />
          </div>

          <DialogFooter>
            <button
              type="button"
              className={cn(buttonVariants({ variant: "outline" }))}
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={cn(buttonVariants({ variant: "default" }))}
              disabled={loading}
            >
              {loading ? "Adding..." : "Add Enrollment"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
