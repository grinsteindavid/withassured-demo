export type StripeInvoiceLine = {
  description: string;
  amount: number;
  quantity: number;
};

export type StripeInvoice = {
  id: string;
  customer: string;
  status: "draft" | "open" | "paid" | "void";
  amount_due: number;
  amount_paid: number;
  lines: StripeInvoiceLine[];
  created_at: string;
};

export type MeterEvent = {
  id: string;
  event_name: string;
  customer: string;
  timestamp: string;
  value: number;
};

export type PaymentMethodDetails = {
  id: string;
  type: "card" | "ach";
  last4: string;
  expiryMonth?: number;
  expiryYear?: number;
  brand?: string;
  customer: string;
  isDefault: boolean;
  created_at: string;
  dbId?: string;
};

export type Subscription = {
  id: string;
  customer: string;
  plan: "STARTUP" | "GROWTH" | "ENTERPRISE";
  status: "ACTIVE" | "PAST_DUE" | "CANCELED" | "TRIALING";
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  created_at: string;
};

type StripeState = {
  paymentMethods: Map<string, PaymentMethodDetails>;
  subscriptions: Map<string, Subscription>;
  invoices: Map<string, StripeInvoice>;
  meterEvents: Map<string, MeterEvent[]>;
  paymentMethodCounter: number;
  subscriptionCounter: number;
  invoiceCounter: number;
  eventCounter: number;
};

// Singleton pattern - survives Next.js hot-reload
const globalForStripe = globalThis as unknown as {
  stripeState?: StripeState;
};

const state: StripeState = globalForStripe.stripeState ?? {
  paymentMethods: new Map(),
  subscriptions: new Map(),
  invoices: new Map(),
  meterEvents: new Map(),
  paymentMethodCounter: 0,
  subscriptionCounter: 0,
  invoiceCounter: 0,
  eventCounter: 0,
};

if (process.env.NODE_ENV !== "production") {
  globalForStripe.stripeState = state;
}

export function createInvoice(params: {
  customerId: string;
  lines: StripeInvoiceLine[];
  autoAdvance?: boolean;
}): StripeInvoice {
  state.invoiceCounter++;
  const id = `inv_mock_${state.invoiceCounter}`;
  const amount_due = params.lines.reduce((sum, line) => sum + line.amount, 0);

  const invoice: StripeInvoice = {
    id,
    customer: params.customerId,
    status: params.autoAdvance ? "open" : "draft",
    amount_due,
    amount_paid: 0,
    lines: params.lines,
    created_at: new Date().toISOString(),
  };

  state.invoices.set(id, invoice);
  return invoice;
}

export function payInvoice(invoiceId: string): { invoice: StripeInvoice; paymentIntentId: string } | null {
  const invoice = state.invoices.get(invoiceId);
  if (!invoice) return null;
  if (invoice.status !== "open" && invoice.status !== "draft") return null;

  invoice.status = "paid";
  invoice.amount_paid = invoice.amount_due;
  return { invoice, paymentIntentId: `pi_mock_${invoiceId}` };
}

export function createMeterEvent(params: {
  event_name: string;
  customer: string;
  timestamp?: string;
  value?: number;
}): MeterEvent {
  state.eventCounter++;
  const event: MeterEvent = {
    id: `me_mock_${state.eventCounter}`,
    event_name: params.event_name,
    customer: params.customer,
    timestamp: params.timestamp || new Date().toISOString(),
    value: params.value ?? 1,
  };

  const existing = state.meterEvents.get(params.customer) || [];
  existing.push(event);
  state.meterEvents.set(params.customer, existing);
  return event;
}

export function getSubscriptionItems(customerId: string): Record<string, number> {
  const events = state.meterEvents.get(customerId) || [];
  const counts: Record<string, number> = {};
  for (const event of events) {
    counts[event.event_name] = (counts[event.event_name] || 0) + event.value;
  }
  return counts;
}

export function listInvoices(customerId?: string): StripeInvoice[] {
  const all = Array.from(state.invoices.values());
  return customerId ? all.filter((inv) => inv.customer === customerId) : all;
}

export function getInvoice(invoiceId: string): StripeInvoice | undefined {
  return state.invoices.get(invoiceId);
}

export function resetMockState(): void {
  state.invoices.clear();
  state.meterEvents.clear();
  state.paymentMethods.clear();
  state.subscriptions.clear();
  state.invoiceCounter = 0;
  state.eventCounter = 0;
  state.paymentMethodCounter = 0;
  state.subscriptionCounter = 0;
}

export function createPaymentMethod(params: {
  customerId: string;
  type: "card" | "ach";
  last4: string;
  expiryMonth?: number;
  expiryYear?: number;
  brand?: string;
  setDefault?: boolean;
}): PaymentMethodDetails {
  state.paymentMethodCounter++;
  const id = `pm_mock_${state.paymentMethodCounter}`;

  // If setDefault is true, unset default on all other methods for this customer
  if (params.setDefault) {
    for (const pm of state.paymentMethods.values()) {
      if (pm.customer === params.customerId) {
        pm.isDefault = false;
      }
    }
  }

  const paymentMethod: PaymentMethodDetails = {
    id,
    type: params.type,
    last4: params.last4,
    expiryMonth: params.expiryMonth ?? 0,
    expiryYear: params.expiryYear ?? 0,
    brand: params.brand,
    customer: params.customerId,
    isDefault: params.setDefault ?? false,
    created_at: new Date().toISOString(),
  };

  state.paymentMethods.set(id, paymentMethod);
  return paymentMethod;
}

export function listPaymentMethods(customerId: string): PaymentMethodDetails[] {
  const all = Array.from(state.paymentMethods.values());
  return all.filter((pm) => pm.customer === customerId);
}

export function setDefaultPaymentMethod(paymentMethodId: string): boolean {
  const paymentMethod = state.paymentMethods.get(paymentMethodId);
  if (!paymentMethod) return false;

  const customerId = paymentMethod.customer;

  // Unset default on all methods for this customer
  for (const pm of state.paymentMethods.values()) {
    if (pm.customer === customerId) {
      pm.isDefault = false;
    }
  }

  // Set default on the specified method
  paymentMethod.isDefault = true;
  return true;
}

export function deletePaymentMethod(paymentMethodId: string): boolean {
  const paymentMethod = state.paymentMethods.get(paymentMethodId);
  if (!paymentMethod) return false;

  state.paymentMethods.delete(paymentMethodId);
  return true;
}

export function createSubscription(params: {
  customerId: string;
  plan: "STARTUP" | "GROWTH" | "ENTERPRISE";
}): Subscription {
  state.subscriptionCounter++;
  const id = `sub_mock_${state.subscriptionCounter}`;

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const subscription: Subscription = {
    id,
    customer: params.customerId,
    plan: params.plan,
    status: "ACTIVE",
    currentPeriodStart: now.toISOString(),
    currentPeriodEnd: periodEnd.toISOString(),
    cancelAtPeriodEnd: false,
    created_at: now.toISOString(),
  };

  state.subscriptions.set(id, subscription);
  return subscription;
}

export function getSubscription(customerId: string): Subscription | undefined {
  const all = Array.from(state.subscriptions.values());
  return all.find((sub) => sub.customer === customerId);
}

export function cancelSubscription(customerId: string): Subscription | null {
  const subscription = getSubscription(customerId);
  if (!subscription) return null;

  subscription.status = "CANCELED";
  subscription.cancelAtPeriodEnd = false;
  return subscription;
}

export function updateSubscription(params: {
  customerId: string;
  plan: "STARTUP" | "GROWTH" | "ENTERPRISE";
  status?: "ACTIVE" | "PAST_DUE" | "CANCELED" | "TRIALING";
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
}): Subscription | null {
  const subscription = getSubscription(params.customerId);
  if (!subscription) return null;

  subscription.plan = params.plan;
  if (params.status) subscription.status = params.status;
  if (params.currentPeriodStart) subscription.currentPeriodStart = params.currentPeriodStart;
  if (params.currentPeriodEnd) subscription.currentPeriodEnd = params.currentPeriodEnd;
  return subscription;
}

// DB sync function - reads from Prisma and populates Stripe mock
export async function syncStripeMockFromDB(): Promise<void> {
  const { prisma } = await import("@/lib/db");

  // Sync PaymentMethods (exclude soft-deleted)
  const dbPaymentMethods = await (prisma as any).paymentMethod.findMany({
    where: { deletedAt: null },
  });
  for (const pm of dbPaymentMethods) {
    state.paymentMethods.set(pm.stripePaymentMethodId, {
      id: pm.stripePaymentMethodId,
      type: pm.type.toLowerCase() as "card" | "ach",
      last4: pm.last4,
      expiryMonth: pm.expiryMonth,
      expiryYear: pm.expiryYear,
      brand: pm.brand,
      customer: pm.orgId,
      isDefault: pm.isDefault,
      created_at: pm.createdAt.toISOString(),
      dbId: pm.id,
    });
  }
  state.paymentMethodCounter = dbPaymentMethods.length;

  // Sync Subscriptions
  const dbSubscriptions = await (prisma as any).subscription.findMany();
  for (const sub of dbSubscriptions) {
    state.subscriptions.set(sub.id, {
      id: sub.id,
      customer: sub.orgId,
      plan: sub.plan,
      status: sub.status,
      currentPeriodStart: sub.currentPeriodStart.toISOString(),
      currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      created_at: sub.createdAt.toISOString(),
    });
  }
  state.subscriptionCounter = dbSubscriptions.length;

  // Sync Invoices
  const dbInvoices = await (prisma as any).invoice.findMany();
  for (const inv of dbInvoices) {
    state.invoices.set(inv.id, {
      id: inv.id,
      customer: inv.orgId,
      status: inv.status.toLowerCase() as "draft" | "open" | "paid" | "void",
      amount_due: inv.totalCents,
      amount_paid: inv.status === "PAID" ? inv.totalCents : 0,
      lines: inv.lineItems as StripeInvoiceLine[],
      created_at: inv.createdAt.toISOString(),
    });
  }
  state.invoiceCounter = dbInvoices.length;
}
