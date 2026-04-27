import { describe, it, expect, mock, beforeEach } from "bun:test";

const refresh = mock(() => {});

mock.module("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { InvoiceDetail } = await import("./invoice-detail");

describe("<InvoiceDetail />", () => {
  beforeEach(() => {
    refresh.mockClear();
  });

  const invoice = {
    id: "inv_1",
    periodStart: "2024-01-01T00:00:00Z",
    periodEnd: "2024-01-31T00:00:00Z",
    subtotalCents: 50000,
    totalCents: 55000,
    status: "OPEN",
    lineItems: [
      { description: "Platform Fee", amount: 50000, quantity: 1 },
      { description: "Usage charges", amount: 5000, quantity: 10 },
    ],
  };

  it("renders invoice header with id and dates", () => {
    render(<InvoiceDetail invoice={invoice} paymentMethods={[]} />);

    expect(screen.getByText(/Invoice inv_1/)).toBeTruthy();
    expect(screen.getByText(/Jan 1, 2024/)).toBeTruthy();
    expect(screen.getByText(/Jan 31, 2024/)).toBeTruthy();
  });

  it("renders line items with amounts", () => {
    render(<InvoiceDetail invoice={invoice} paymentMethods={[]} />);

    expect(screen.getByText("Platform Fee")).toBeTruthy();
    expect(screen.getByText("Usage charges")).toBeTruthy();
    expect(screen.getByText("Quantity: 1")).toBeTruthy();
    expect(screen.getByText("Quantity: 10")).toBeTruthy();
  });

  it("renders subtotal and total formatted", () => {
    render(<InvoiceDetail invoice={invoice} paymentMethods={[]} />);

    expect(screen.getByText("Subtotal")).toBeTruthy();
    expect(screen.getByText("Total")).toBeTruthy();
  });

  it("renders download PDF button", () => {
    render(<InvoiceDetail invoice={invoice} paymentMethods={[]} />);

    expect(screen.getByText("Download PDF")).toBeTruthy();
  });

  it("shows payment section when invoice is open and methods exist", () => {
    const paymentMethods = [
      { id: "pm_1", last4: "4242", type: "card" },
    ];

    render(<InvoiceDetail invoice={invoice} paymentMethods={paymentMethods} />);

    expect(screen.getByText("Pay with Saved Card")).toBeTruthy();
    expect(screen.getByText(/Card •••• 4242/)).toBeTruthy();
  });

  it("shows add payment method message when open but no methods", () => {
    render(<InvoiceDetail invoice={invoice} paymentMethods={[]} />);

    expect(screen.getByText("Add a payment method to pay this invoice.")).toBeTruthy();
  });

  it("hides payment section when invoice is paid", () => {
    const paidInvoice = { ...invoice, status: "PAID" };
    const paymentMethods = [{ id: "pm_1", last4: "4242", type: "card" }];

    render(<InvoiceDetail invoice={paidInvoice} paymentMethods={paymentMethods} />);

    expect(screen.queryByText("Pay with Saved Card")).toBeNull();
  });

  it("calls pay API with selected method and refreshes", async () => {
    const fetchMock = mock(() =>
      Promise.resolve({ ok: true } as Response)
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const paymentMethods = [
      { id: "pm_1", last4: "4242", type: "card" },
    ];

    render(<InvoiceDetail invoice={invoice} paymentMethods={paymentMethods} />);

    const methodSelect = screen.getByText(/Card •••• 4242/).closest("select")!;
    await userEvent.selectOptions(methodSelect, "pm_1");

    const payButton = screen.getByText("Pay Now");
    await userEvent.click(payButton);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/billing/invoices/inv_1/pay-with-method",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethodId: "pm_1" }),
      })
    );
    expect(refresh).toHaveBeenCalled();
    expect(screen.getByText("Payment successful")).toBeTruthy();
  });

  it("shows pay error when API fails", async () => {
    const fetchMock = mock(() =>
      Promise.resolve({ ok: false, json: () => Promise.resolve({ error: "Card declined" }) } as Response)
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const paymentMethods = [
      { id: "pm_1", last4: "4242", type: "card" },
    ];

    render(<InvoiceDetail invoice={invoice} paymentMethods={paymentMethods} />);

    const methodSelect = screen.getByText(/Card •••• 4242/).closest("select")!;
    await userEvent.selectOptions(methodSelect, "pm_1");

    const payButton = screen.getByText("Pay Now");
    await userEvent.click(payButton);

    expect(screen.getByText("Card declined")).toBeTruthy();
  });

  it("disables pay button when no method selected", () => {
    const paymentMethods = [
      { id: "pm_1", last4: "4242", type: "card" },
    ];

    render(<InvoiceDetail invoice={invoice} paymentMethods={paymentMethods} />);

    const payButton = screen.getByText("Pay Now") as HTMLButtonElement;
    expect(payButton.disabled).toBe(true);
  });

  it("disables pay button and select while loading", async () => {
    let resolveFetch: (value: Response) => void;
    const fetchPromise = new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    });
    const fetchMock = mock(() => fetchPromise);
    global.fetch = fetchMock as unknown as typeof fetch;

    const paymentMethods = [
      { id: "pm_1", last4: "4242", type: "card" },
    ];

    render(<InvoiceDetail invoice={invoice} paymentMethods={paymentMethods} />);

    const methodSelect = screen.getByText(/Card •••• 4242/).closest("select")! as HTMLSelectElement;
    await userEvent.selectOptions(methodSelect, "pm_1");

    const payButton = screen.getByText("Pay Now") || screen.getByText("Processing...");
    await userEvent.click(payButton);

    const processingButton = screen.getByText("Processing...") as HTMLButtonElement;
    expect(processingButton.disabled).toBe(true);
    expect(methodSelect.disabled).toBe(true);

    resolveFetch!({ ok: true } as Response);
    await fetchPromise;
  });

  it("fetches and downloads PDF on button click", async () => {
    const blob = new Blob(["fake-pdf"], { type: "application/pdf" });
    const fetchMock = mock(() =>
      Promise.resolve({
        ok: true,
        blob: () => Promise.resolve(blob),
      } as Response)
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const createObjectURLMock = mock(() => "blob:fake-url");
    global.URL.createObjectURL = createObjectURLMock;
    global.URL.revokeObjectURL = mock(() => {});

    render(<InvoiceDetail invoice={invoice} paymentMethods={[]} />);

    const downloadButton = screen.getByText("Download PDF");
    await userEvent.click(downloadButton);

    expect(fetchMock).toHaveBeenCalledWith("/api/billing/invoices/inv_1/pdf?download=1");
    expect(createObjectURLMock).toHaveBeenCalled();
  });

  it("renders inline PDF preview iframe", () => {
    render(<InvoiceDetail invoice={invoice} paymentMethods={[]} />);

    const iframe = document.querySelector("iframe") as HTMLIFrameElement;
    expect(iframe).toBeTruthy();
    expect(iframe.src).toContain("/api/billing/invoices/inv_1/pdf");
  });
});
