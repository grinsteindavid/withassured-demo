import { prisma } from "@/lib/db";
import {
  createPaymentMethod,
  listPaymentMethods as stripeListPaymentMethods,
  setDefaultPaymentMethod as stripeSetDefaultPaymentMethod,
  deletePaymentMethod as stripeDeletePaymentMethod,
  createSubscription as stripeCreateSubscription,
  getSubscription as stripeGetSubscription,
  cancelSubscription as stripeCancelSubscription,
  updateSubscription as stripeUpdateSubscription,
  type PaymentMethodDetails,
  type Subscription,
} from "@/lib/stripe-mock";
import { getCurrentUsage } from "@/lib/billing";

export const SUBSCRIPTION_PRICING = {
  STARTUP: { platformFeeCents: 29_900, name: "Startup" },
  GROWTH: { platformFeeCents: 99_900, name: "Growth" },
  ENTERPRISE: { platformFeeCents: 299_900, name: "Enterprise" },
} as const;

export async function addPaymentMethod(
  orgId: string,
  params: {
    type: "CARD" | "ACH";
    last4: string;
    expiryMonth: number;
    expiryYear: number;
    brand?: string;
    setDefault?: boolean;
  },
): Promise<PaymentMethodDetails> {
  const stripeMethod = createPaymentMethod({
    customerId: orgId,
    type: params.type.toLowerCase() as "card" | "ach",
    last4: params.last4,
    expiryMonth: params.expiryMonth,
    expiryYear: params.expiryYear,
    brand: params.brand,
    setDefault: params.setDefault,
  });

  await prisma.paymentMethod.create({
    data: {
      orgId,
      type: params.type,
      isDefault: params.setDefault ?? false,
      stripePaymentMethodId: stripeMethod.id,
    },
  });

  return stripeMethod;
}

export async function listPaymentMethods(orgId: string): Promise<PaymentMethodDetails[]> {
  const dbMethods = await prisma.paymentMethod.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
  });

  const stripeMethods = stripeListPaymentMethods(orgId);

  // Merge DB references with Stripe details
  return dbMethods
    .map((dbMethod: { stripePaymentMethodId: string }) => {
      const stripeMethod = stripeMethods.find((sm) => sm.id === dbMethod.stripePaymentMethodId);
      if (!stripeMethod) return null;
      return {
        ...stripeMethod,
        type: stripeMethod.type === "card" ? "CARD" : "ACH",
      };
    })
    .filter((m): m is PaymentMethodDetails => m !== null);
}

export async function setDefaultPaymentMethod(orgId: string, methodId: string): Promise<boolean> {
  const dbMethod = await prisma.paymentMethod.findFirst({
    where: { id: methodId, orgId },
  });

  if (!dbMethod) return false;

  // Unset default on all methods for this org
  await prisma.paymentMethod.updateMany({
    where: { orgId },
    data: { isDefault: false },
  });

  // Set default on the specified method
  await prisma.paymentMethod.update({
    where: { id: methodId },
    data: { isDefault: true },
  });

  // Also update in Stripe mock
  stripeSetDefaultPaymentMethod(dbMethod.stripePaymentMethodId);

  return true;
}

export async function removePaymentMethod(orgId: string, methodId: string): Promise<boolean> {
  const dbMethod = await prisma.paymentMethod.findFirst({
    where: { id: methodId, orgId },
  });

  if (!dbMethod) return false;

  // Delete from Stripe mock
  stripeDeletePaymentMethod(dbMethod.stripePaymentMethodId);

  // Delete from DB
  await prisma.paymentMethod.delete({
    where: { id: methodId },
  });

  return true;
}

export async function getSubscription(orgId: string): Promise<Subscription | null> {
  const dbSubscription = await (prisma as any).subscription.findUnique({
    where: { orgId },
  });

  if (!dbSubscription) return null;

  const stripeSubscription = stripeGetSubscription(orgId);
  if (!stripeSubscription) return null;

  return {
    ...stripeSubscription,
    plan: dbSubscription.plan as "STARTUP" | "GROWTH" | "ENTERPRISE",
  };
}

export async function createSubscription(
  orgId: string,
  plan: "STARTUP" | "GROWTH" | "ENTERPRISE",
): Promise<Subscription> {
  // Check if subscription already exists
  const existing = await (prisma as any).subscription.findUnique({
    where: { orgId },
  });

  if (existing) {
    // Update existing subscription
    const stripeSub = stripeUpdateSubscription({
      customerId: orgId,
      plan,
    });

    await (prisma as any).subscription.update({
      where: { orgId },
      data: { plan, status: "ACTIVE" },
    });

    return stripeSub!;
  }

  // Create new subscription in Stripe mock
  const stripeSubscription = stripeCreateSubscription({
    customerId: orgId,
    plan,
  });

  // Create in DB
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  await (prisma as any).subscription.create({
    data: {
      orgId,
      plan,
      status: "ACTIVE",
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
    },
  });

  return stripeSubscription;
}

export async function cancelSubscription(orgId: string): Promise<Subscription | null> {
  const dbSubscription = await (prisma as any).subscription.findUnique({
    where: { orgId },
  });

  if (!dbSubscription) return null;

  // Cancel in Stripe mock
  const stripeSubscription = stripeCancelSubscription(orgId);
  if (!stripeSubscription) return null;

  // Update in DB
  await (prisma as any).subscription.update({
    where: { orgId },
    data: { cancelAtPeriodEnd: true },
  });

  return stripeSubscription;
}

export async function generateMonthlyInvoice(orgId: string): Promise<void> {
  const subscription = await (prisma as any).subscription.findUnique({
    where: { orgId },
  });

  if (!subscription || subscription.status !== "ACTIVE") {
    return;
  }

  // Get current period usage
  const usage = await getCurrentUsage("current", orgId);

  // Create invoice in Stripe mock
  const { createInvoice } = await import("@/lib/stripe-mock");
  const lines = usage.lines.map((line) => ({
    description: `${line.type} (${line.count} × $${line.unitCents / 100})`,
    amount: line.subtotalCents,
    quantity: line.count,
  }));

  // Add platform fee
  lines.push({
    description: `Platform Fee (${SUBSCRIPTION_PRICING[subscription.plan as keyof typeof SUBSCRIPTION_PRICING].name})`,
    amount: usage.platformFeeCents,
    quantity: 1,
  });

  const stripeInvoice = createInvoice({
    customerId: orgId,
    lines,
    autoAdvance: true,
  });

  // Create invoice in DB
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  await prisma.invoice.create({
    data: {
      orgId,
      periodStart,
      periodEnd,
      subtotalCents: usage.subtotalCents,
      totalCents: usage.totalCents,
      status: "OPEN",
      lineItems: usage.lines as any,
    },
  });

  // Mark usage events as invoiced
  await prisma.usageEvent.updateMany({
    where: {
      orgId,
      occurredAt: { gte: periodStart, lte: periodEnd },
      invoiceId: null,
    },
    data: { invoiceId: stripeInvoice.id },
  });
}
