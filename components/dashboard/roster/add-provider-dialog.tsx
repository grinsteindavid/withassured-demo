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

export function AddProviderDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    npi: "",
    name: "",
    specialty: "",
    status: "PENDING" as "ACTIVE" | "INACTIVE" | "PENDING",
    licenseState: "",
    licenseNumber: "",
    licenseExpiresAt: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setOpen(false);
        setFormData({
          npi: "",
          name: "",
          specialty: "",
          status: "PENDING",
          licenseState: "",
          licenseNumber: "",
          licenseExpiresAt: "",
        });
        router.refresh();
      } else {
        const body = await res.json().catch(() => ({ error: "Unknown error" }));
        setError(body.error || "Failed to add provider");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <span className={cn(buttonVariants({ variant: "default" }))}>Add Provider</span>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Provider</DialogTitle>
          <DialogDescription>
            Enter provider details and initial license information.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">NPI</label>
            <input
              type="text"
              maxLength={10}
              value={formData.npi}
              onChange={(e) => setFormData({ ...formData, npi: e.target.value })}
              className="w-full p-2 border rounded"
              placeholder="10-digit NPI"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full p-2 border rounded"
              placeholder="Dr. Jane Smith"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Specialty</label>
            <input
              type="text"
              value={formData.specialty}
              onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
              className="w-full p-2 border rounded"
              placeholder="Cardiology"
              required
            />
          </div>

          <div className="border-t pt-4">
            <h4 className="text-sm font-semibold mb-3">Initial License</h4>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">State</label>
                <input
                  type="text"
                  value={formData.licenseState}
                  onChange={(e) => setFormData({ ...formData, licenseState: e.target.value })}
                  className="w-full p-2 border rounded"
                  placeholder="CA"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">License Number</label>
                <input
                  type="text"
                  value={formData.licenseNumber}
                  onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                  className="w-full p-2 border rounded"
                  placeholder="A12345"
                  required
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium mb-1">Expiration Date</label>
              <input
                type="date"
                value={formData.licenseExpiresAt}
                onChange={(e) => setFormData({ ...formData, licenseExpiresAt: e.target.value })}
                className="w-full p-2 border rounded"
                required
              />
            </div>
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
              {loading ? "Adding..." : "Add Provider"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
