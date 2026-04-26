"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Subscription } from "@/lib/stripe-mock";

export function SubscriptionCard({
  subscription,
}: {
  subscription: Subscription | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/payments/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "GROWTH" }),
      });
      if (res.ok) {
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to upgrade subscription:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/payments/subscription/cancel", {
        method: "POST",
      });
      if (res.ok) {
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to cancel subscription:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!subscription) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Subscription</h3>
            <p className="text-sm text-muted-foreground">No active subscription</p>
          </div>
          <Button onClick={handleUpgrade} disabled={loading}>
            {loading ? "Processing..." : "Subscribe"}
          </Button>
        </div>
      </Card>
    );
  }

  const planNames: Record<string, string> = {
    STARTUP: "Startup",
    GROWTH: "Growth",
    ENTERPRISE: "Enterprise",
  };

  const statusColors: Record<string, "default" | "secondary" | "destructive"> = {
    ACTIVE: "default",
    PAST_DUE: "destructive",
    CANCELED: "secondary",
    TRIALING: "default",
  };

  const periodEnd = new Date(subscription.currentPeriodEnd);
  const formattedPeriodEnd = periodEnd.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    day: "numeric",
  });

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">Subscription</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-2xl font-bold">{planNames[subscription.plan]}</span>
            <Badge variant={statusColors[subscription.status] || "default"}>
              {subscription.status}
            </Badge>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleUpgrade} disabled={loading}>
          {loading ? "Processing..." : "Change Plan"}
        </Button>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Current period ends:</span>
          <span className="font-medium">{formattedPeriodEnd}</span>
        </div>
        {subscription.cancelAtPeriodEnd && (
          <div className="flex justify-between text-destructive">
            <span>Cancellation scheduled:</span>
            <span className="font-medium">Will cancel on {formattedPeriodEnd}</span>
          </div>
        )}
      </div>

      {!subscription.cancelAtPeriodEnd && subscription.status === "ACTIVE" && (
        <div className="mt-4 pt-4 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            disabled={loading}
            className="text-destructive hover:text-destructive"
          >
            {loading ? "Processing..." : "Cancel Subscription"}
          </Button>
        </div>
      )}
    </Card>
  );
}
