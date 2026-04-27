import { describe, it, expect, mock, beforeEach } from "bun:test";

const refresh = mock(() => {});
const push = mock(() => {});

mock.module("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { PaymentMethods } = await import("./payment-methods");

describe("<PaymentMethods />", () => {
  beforeEach(() => {
    refresh.mockClear();
    push.mockClear();
  });

  it("renders empty state when no methods", () => {
    render(<PaymentMethods methods={[]} />);

    expect(screen.getByText("Payment Methods")).toBeTruthy();
    expect(screen.getByText("No payment methods saved")).toBeTruthy();
    expect(screen.getByText("Add Payment Method")).toBeTruthy();
  });

  it("renders card details with default badge", () => {
    const methods = [
      {
        id: "pm_1",
        type: "card" as const,
        last4: "4242",
        expiryMonth: 12,
        expiryYear: 2026,
        brand: "Visa",
        customer: "cust_1",
        isDefault: true,
        created_at: "2024-01-01T00:00:00Z",
      },
    ];

    render(<PaymentMethods methods={methods} />);

    expect(screen.getByText(/Card •••• 4242/)).toBeTruthy();
    expect(screen.getByText("Visa")).toBeTruthy();
    expect(screen.getByText(/Expires 12\/2026/)).toBeTruthy();
    expect(screen.getByText("Default")).toBeTruthy();
  });

  it("renders ACH method without brand or expiry", () => {
    const methods = [
      {
        id: "pm_2",
        type: "ach" as const,
        last4: "9876",
        expiryMonth: 0,
        expiryYear: 0,
        customer: "cust_1",
        isDefault: false,
        created_at: "2024-01-01T00:00:00Z",
      },
    ];

    render(<PaymentMethods methods={methods} />);

    expect(screen.getByText(/ACH •••• 9876/)).toBeTruthy();
    expect(screen.queryByText("Default")).toBeNull();
  });

  it("navigates to add payment method page on add click", async () => {
    render(<PaymentMethods methods={[]} />);

    const addButton = screen.getByText("Add Payment Method");
    await userEvent.click(addButton);

    expect(push).toHaveBeenCalledWith("/dashboard/billing/add-payment-method");
  });

  it("calls set default API and refreshes on set default click", async () => {
    const fetchMock = mock(() =>
      Promise.resolve({ ok: true } as Response)
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const methods = [
      {
        id: "pm_1",
        type: "card" as const,
        last4: "4242",
        expiryMonth: 12,
        expiryYear: 2026,
        brand: "Visa",
        customer: "cust_1",
        isDefault: false,
        created_at: "2024-01-01T00:00:00Z",
      },
    ];

    render(<PaymentMethods methods={methods} />);

    const setDefaultButton = screen.getByText("Set Default");
    await userEvent.click(setDefaultButton);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/payments/methods/pm_1/default",
      { method: "POST" }
    );
    expect(refresh).toHaveBeenCalled();
  });

  it("calls remove API and refreshes on remove click", async () => {
    const fetchMock = mock(() =>
      Promise.resolve({ ok: true } as Response)
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const methods = [
      {
        id: "pm_1",
        type: "card" as const,
        last4: "4242",
        expiryMonth: 12,
        expiryYear: 2026,
        brand: "Visa",
        customer: "cust_1",
        isDefault: false,
        created_at: "2024-01-01T00:00:00Z",
      },
    ];

    render(<PaymentMethods methods={methods} />);

    const removeButton = screen.getByText("Remove");
    await userEvent.click(removeButton);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/payments/methods/pm_1",
      { method: "DELETE" }
    );
    expect(refresh).toHaveBeenCalled();
  });

  it("disables buttons and shows loading text during operation", async () => {
    let resolveFetch: (value: Response) => void;
    const fetchPromise = new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    });
    const fetchMock = mock(() => fetchPromise);
    global.fetch = fetchMock as unknown as typeof fetch;

    const methods = [
      {
        id: "pm_1",
        type: "card" as const,
        last4: "4242",
        expiryMonth: 12,
        expiryYear: 2026,
        brand: "Visa",
        customer: "cust_1",
        isDefault: false,
        created_at: "2024-01-01T00:00:00Z",
      },
    ];

    render(<PaymentMethods methods={methods} />);

    const setDefaultButton = screen.getByText("Set Default");
    await userEvent.click(setDefaultButton);

    expect(screen.getByText("Setting...")).toBeTruthy();
    expect(screen.getByText("Removing...")).toBeTruthy();

    resolveFetch!({ ok: true } as Response);
    await fetchPromise;
  });

  it("hides set default button for default method", () => {
    const methods = [
      {
        id: "pm_1",
        type: "card" as const,
        last4: "4242",
        expiryMonth: 12,
        expiryYear: 2026,
        brand: "Visa",
        customer: "cust_1",
        isDefault: true,
        created_at: "2024-01-01T00:00:00Z",
      },
    ];

    render(<PaymentMethods methods={methods} />);

    expect(screen.queryByText("Set Default")).toBeNull();
  });
});
