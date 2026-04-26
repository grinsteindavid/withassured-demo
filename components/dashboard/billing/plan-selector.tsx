"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SUBSCRIPTION_PRICING } from "@/lib/payments";
import { useRouter } from "next/navigation";

export function PlanSelector({ currentPlan, onClose }: { currentPlan: string | null; onClose: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(currentPlan);

  const plans = [
    { id: "STARTUP", name: "Startup", description: "For growing healthcare startups", features: ["Basic credentialing", "License tracking", "Email support"] },
    { id: "GROWTH", name: "Growth", description: "For scaling operations", features: ["Advanced credentialing", "Priority support", "API access", "Custom integrations"] },
    { id: "ENTERPRISE", name: "Enterprise", description: "For large organizations", features: ["Full platform access", "Dedicated support", "SLA guarantee", "Custom workflows"] },
  ] as const;

  const handleSubscribe = async (plan: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/payments/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });

      if (res.ok) {
        router.refresh();
        onClose();
      } else {
        console.error("Failed to subscribe");
      }
    } catch (error) {
      console.error("Error subscribing:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Select a Plan</h3>
      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`p-4 border rounded-lg cursor-pointer transition-colors ${
              selectedPlan === plan.id ? "border-primary bg-primary/5" : "hover:border-gray-300"
            }`}
            onClick={() => setSelectedPlan(plan.id)}
          >
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold">{plan.name}</h4>
                {currentPlan === plan.id && <Badge variant="secondary">Current</Badge>}
              </div>
              <p className="text-2xl font-bold">
                ${(SUBSCRIPTION_PRICING[plan.id as keyof typeof SUBSCRIPTION_PRICING].platformFeeCents / 100).toLocaleString()}
                <span className="text-sm font-normal text-muted-foreground">/mo</span>
              </p>
              <p className="text-sm text-muted-foreground">{plan.description}</p>
            </div>
            <ul className="space-y-1 text-sm mb-4">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  {feature}
                </li>
              ))}
            </ul>
            <Button
              variant={selectedPlan === plan.id ? "default" : "outline"}
              className="w-full"
              onClick={(e) => {
                e.stopPropagation();
                handleSubscribe(plan.id);
              }}
              disabled={loading || currentPlan === plan.id}
            >
              {loading ? "Processing..." : currentPlan === plan.id ? "Current Plan" : "Subscribe"}
            </Button>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-4 border-t">
        <Button variant="ghost" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
      </div>
    </Card>
  );
}
