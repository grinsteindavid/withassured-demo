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

let invoiceCounter = 0;
let eventCounter = 0;

const invoices = new Map<string, StripeInvoice>();
const meterEvents = new Map<string, MeterEvent[]>();

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
  invoiceCounter = 0;
  eventCounter = 0;
}
