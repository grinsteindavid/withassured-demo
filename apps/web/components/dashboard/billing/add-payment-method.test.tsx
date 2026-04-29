import { describe, it, expect, mock, beforeEach } from "bun:test";

const push = mock(() => {});
const refresh = mock(() => {});

mock.module("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { AddPaymentMethod } = await import("./add-payment-method");

describe("<AddPaymentMethod />", () => {
  beforeEach(() => {
    push.mockClear();
    refresh.mockClear();
  });

  it("renders form with default CARD type selected", () => {
    render(<AddPaymentMethod />);

    expect(screen.getByRole("heading", { name: "Add Payment Method" })).toBeTruthy();
    expect(screen.getByText("Type").closest("div")!.querySelector("select")).toBeTruthy();
    expect(screen.getByPlaceholderText("••••")).toBeTruthy();
  });

  it("switches to ACH and hides card fields", async () => {
    render(<AddPaymentMethod />);

    const typeSelect = screen.getByText("Type").closest("div")!.querySelector("select")!;
    await userEvent.selectOptions(typeSelect, "ACH");

    expect(screen.queryByPlaceholderText("MM")).toBeNull();
    expect(screen.getByPlaceholderText("••••")).toBeTruthy();
  });

  it("updates card fields on input", async () => {
    render(<AddPaymentMethod />);

    const last4Input = screen.getByPlaceholderText("••••") as HTMLInputElement;
    await userEvent.type(last4Input, "4242");
    expect(last4Input.value).toBe("4242");

    const brandSelect = screen.getByText("Brand (optional)").closest("div")!.querySelector("select")!;
    await userEvent.selectOptions(brandSelect, "Visa");
    expect(brandSelect.value).toBe("Visa");

    const monthInput = screen.getByPlaceholderText("MM") as HTMLInputElement;
    await userEvent.type(monthInput, "12");
    expect(monthInput.value).toBe("12");

    const yearInput = screen.getByPlaceholderText("YYYY") as HTMLInputElement;
    await userEvent.type(yearInput, "2026");
    expect(yearInput.value).toBe("2026");
  });

  it("toggles set default checkbox", async () => {
    render(<AddPaymentMethod />);

    const checkbox = screen.getByRole("checkbox") as HTMLInputElement;
    expect(checkbox.checked).toBe(false);

    await userEvent.click(checkbox);
    expect(checkbox.checked).toBe(true);
  });

  it("submits form with correct payload and navigates", async () => {
    const fetchMock = mock(() =>
      Promise.resolve({ ok: true } as Response)
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<AddPaymentMethod />);

    const last4Input = screen.getByPlaceholderText("••••");
    await userEvent.type(last4Input, "4242");

    const brandSelect = screen.getByText("Brand (optional)").closest("div")!.querySelector("select")!;
    await userEvent.selectOptions(brandSelect, "Visa");

    const monthInput = screen.getByPlaceholderText("MM");
    await userEvent.type(monthInput, "12");

    const yearInput = screen.getByPlaceholderText("YYYY");
    await userEvent.type(yearInput, "2026");

    const checkbox = screen.getByRole("checkbox");
    await userEvent.click(checkbox);

    const submitButton = screen.getByRole("button", { name: "Add Payment Method" });
    await userEvent.click(submitButton);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/payments/methods",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: expect.stringContaining("\"type\":\"CARD\""),
      })
    );

    const calls = fetchMock.mock.calls as unknown as [string, RequestInit][];
    const callBody = JSON.parse(calls[0][1].body as string);
    expect(callBody).toEqual({
      type: "CARD",
      last4: "4242",
      expiryMonth: "12",
      expiryYear: "2026",
      brand: "Visa",
      setDefault: true,
    });

    expect(push).toHaveBeenCalledWith("/dashboard/billing");
    expect(refresh).toHaveBeenCalled();
  });

  it("submits ACH form with correct payload", async () => {
    const fetchMock = mock(() =>
      Promise.resolve({ ok: true } as Response)
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<AddPaymentMethod />);

    const typeSelect = screen.getByText("Type").closest("div")!.querySelector("select")!;
    await userEvent.selectOptions(typeSelect, "ACH");

    const last4Input = screen.getByPlaceholderText("••••");
    await userEvent.type(last4Input, "9876");

    const submitButton = screen.getByRole("button", { name: "Add Payment Method" });
    await userEvent.click(submitButton);

    const calls = fetchMock.mock.calls as unknown as [string, RequestInit][];
    const callBody = JSON.parse(calls[0][1].body as string);
    expect(callBody.type).toBe("ACH");
    expect(callBody.last4).toBe("9876");
  });

  it("cancels and navigates back on cancel click", async () => {
    render(<AddPaymentMethod />);

    const cancelButton = screen.getByRole("button", { name: "Cancel" });
    await userEvent.click(cancelButton);

    expect(push).toHaveBeenCalledWith("/dashboard/billing");
  });

  it("disables buttons while loading", async () => {
    let resolveFetch: (value: Response) => void;
    const fetchPromise = new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    });
    const fetchMock = mock(() => fetchPromise);
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<AddPaymentMethod />);

    const last4Input = screen.getByPlaceholderText("••••");
    await userEvent.type(last4Input, "4242");

    const monthInput = screen.getByPlaceholderText("MM");
    await userEvent.type(monthInput, "12");

    const yearInput = screen.getByPlaceholderText("YYYY");
    await userEvent.type(yearInput, "2026");

    const submitButton = screen.getByRole("button", { name: "Add Payment Method" });
    await userEvent.click(submitButton);

    const cancelButton = screen.getByRole("button", { name: "Cancel" }) as HTMLButtonElement;
    expect(cancelButton.disabled).toBe(true);

    resolveFetch!({ ok: true } as Response);
    await fetchPromise;
  });
});
