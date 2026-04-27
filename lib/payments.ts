import "server-only";

import { prisma } from "@/lib/db";
import { softDeleteData, softDeleteFilter } from "@/lib/soft-delete";
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

export async function addPaymentMethod(
  orgId: string,
  params: {
    type: "CARD" | "ACH";
    last4: string;
    expiryMonth?: number;
    expiryYear?: number;
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
    where: { orgId, ...softDeleteFilter() },
    orderBy: { createdAt: "desc" },
  });

  const stripeMethods = stripeListPaymentMethods(orgId);

  // Merge DB references with Stripe details
  const methods = dbMethods
    .map((dbMethod) => {
      const stripeMethod = stripeMethods.find((sm) => sm.id === dbMethod.stripePaymentMethodId);
      if (!stripeMethod) return null;
      return { ...stripeMethod, dbId: dbMethod.id } as PaymentMethodDetails;
    })
    .filter((m) => m !== null) as PaymentMethodDetails[];
  return methods;
}

export async function setDefaultPaymentMethod(orgId: string, methodId: string): Promise<boolean> {
  const dbMethod = await prisma.paymentMethod.findFirst({
    where: { id: methodId, orgId, ...softDeleteFilter() },
  });

  if (!dbMethod) return false;

  // Unset default on all methods for this org
  await prisma.paymentMethod.updateMany({
    where: { orgId, ...softDeleteFilter() },
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

export async function removePaymentMethod(orgId: string, methodId: string, userId: string): Promise<boolean> {
  const dbMethod = await prisma.paymentMethod.findFirst({
    where: { id: methodId, orgId, ...softDeleteFilter() },
  });

  if (!dbMethod) return false;

  // Delete from Stripe mock
  stripeDeletePaymentMethod(dbMethod.stripePaymentMethodId);

  // Soft-delete from DB
  await prisma.paymentMethod.update({
    where: { id: methodId },
    data: { ...softDeleteData(userId), isDefault: false },
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
    // Update existing subscription (reactivation or plan change)
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const stripeSub = stripeUpdateSubscription({
      customerId: orgId,
      plan,
      status: "ACTIVE",
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: periodEnd.toISOString(),
    });

    await (prisma as any).subscription.update({
      where: { orgId },
      data: {
        plan,
        status: "ACTIVE",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
      },
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

  // Update in DB - immediate cancellation
  await (prisma as any).subscription.update({
    where: { orgId },
    data: { status: "CANCELED", cancelAtPeriodEnd: false },
  });

  return stripeSubscription;
}

