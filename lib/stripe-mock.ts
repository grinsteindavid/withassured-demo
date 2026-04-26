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
  expiryMonth: number;
  expiryYear: number;
  brand?: string;
  customer: string;
  isDefault: boolean;
  created_at: string;
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

let invoiceCounter = 0;
let eventCounter = 0;
let paymentMethodCounter = 0;
let subscriptionCounter = 0;

const invoices = new Map<string, StripeInvoice>();
const meterEvents = new Map<string, MeterEvent[]>();
const paymentMethods = new Map<string, PaymentMethodDetails>();
const subscriptions = new Map<string, Subscription>();

export function createInvoice(params: {
  customerId: string;
  lines: StripeInvoiceLine[];
  autoAdvance?: boolean;
}): StripeInvoice {
  invoiceCounter++;
  const id = `inv_mock_${invoiceCounter}`;
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

  invoices.set(id, invoice);
  return invoice;
}

export function payInvoice(invoiceId: string): { invoice: StripeInvoice; paymentIntentId: string } | null {
  const invoice = invoices.get(invoiceId);
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
  eventCounter++;
  const event: MeterEvent = {
    id: `me_mock_${eventCounter}`,
    event_name: params.event_name,
    customer: params.customer,
    timestamp: params.timestamp || new Date().toISOString(),
    value: params.value ?? 1,
  };

  const existing = meterEvents.get(params.customer) || [];
  existing.push(event);
  meterEvents.set(params.customer, existing);
  return event;
}

export function getSubscriptionItems(customerId: string): Record<string, number> {
  const events = meterEvents.get(customerId) || [];
  const counts: Record<string, number> = {};
  for (const event of events) {
    counts[event.event_name] = (counts[event.event_name] || 0) + event.value;
  }
  return counts;
}

export function listInvoices(customerId?: string): StripeInvoice[] {
  const all = Array.from(invoices.values());
  return customerId ? all.filter((inv) => inv.customer === customerId) : all;
}

export function getInvoice(invoiceId: string): StripeInvoice | undefined {
  return invoices.get(invoiceId);
}

export function resetMockState(): void {
  invoices.clear();
  meterEvents.clear();
  paymentMethods.clear();
  subscriptions.clear();
  invoiceCounter = 0;
  eventCounter = 0;
  paymentMethodCounter = 0;
  subscriptionCounter = 0;
}

export function createPaymentMethod(params: {
  customerId: string;
  type: "card" | "ach";
  last4: string;
  expiryMonth: number;
  expiryYear: number;
  brand?: string;
  setDefault?: boolean;
}): PaymentMethodDetails {
  paymentMethodCounter++;
  const id = `pm_mock_${paymentMethodCounter}`;

  // If setDefault is true, unset default on all other methods for this customer
  if (params.setDefault) {
    for (const pm of paymentMethods.values()) {
      if (pm.customer === params.customerId) {
        pm.isDefault = false;
      }
    }
  }

  const paymentMethod: PaymentMethodDetails = {
    id,
    type: params.type,
    last4: params.last4,
    expiryMonth: params.expiryMonth,
    expiryYear: params.expiryYear,
    brand: params.brand,
    customer: params.customerId,
    isDefault: params.setDefault ?? false,
    created_at: new Date().toISOString(),
  };

  paymentMethods.set(id, paymentMethod);
  return paymentMethod;
}

export function listPaymentMethods(customerId: string): PaymentMethodDetails[] {
  const all = Array.from(paymentMethods.values());
  return all.filter((pm) => pm.customer === customerId);
}

export function setDefaultPaymentMethod(paymentMethodId: string): boolean {
  const paymentMethod = paymentMethods.get(paymentMethodId);
  if (!paymentMethod) return false;

  const customerId = paymentMethod.customer;

  // Unset default on all methods for this customer
  for (const pm of paymentMethods.values()) {
    if (pm.customer === customerId) {
      pm.isDefault = false;
    }
  }

  // Set default on the specified method
  paymentMethod.isDefault = true;
  return true;
}

export function deletePaymentMethod(paymentMethodId: string): boolean {
  const paymentMethod = paymentMethods.get(paymentMethodId);
  if (!paymentMethod) return false;

  paymentMethods.delete(paymentMethodId);
  return true;
}

export function createSubscription(params: {
  customerId: string;
  plan: "STARTUP" | "GROWTH" | "ENTERPRISE";
}): Subscription {
  subscriptionCounter++;
  const id = `sub_mock_${subscriptionCounter}`;

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

  subscriptions.set(id, subscription);
  return subscription;
}

export function getSubscription(customerId: string): Subscription | undefined {
  const all = Array.from(subscriptions.values());
  return all.find((sub) => sub.customer === customerId);
}

export function cancelSubscription(customerId: string): Subscription | null {
  const subscription = getSubscription(customerId);
  if (!subscription) return null;

  subscription.cancelAtPeriodEnd = true;
  return subscription;
}

export function updateSubscription(params: {
  customerId: string;
  plan: "STARTUP" | "GROWTH" | "ENTERPRISE";
}): Subscription | null {
  const subscription = getSubscription(params.customerId);
  if (!subscription) return null;

  subscription.plan = params.plan;
  return subscription;
}
