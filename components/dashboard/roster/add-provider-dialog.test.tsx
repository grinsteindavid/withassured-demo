import { describe, it, expect, mock, beforeEach } from "bun:test";

const push = mock(() => {});
const refresh = mock(() => {});

mock.module("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { AddProviderDialog } = await import("./add-provider-dialog");

describe("<AddProviderDialog />", () => {
  beforeEach(() => {
    push.mockClear();
    refresh.mockClear();
  });

  it("opens dialog on trigger click", async () => {
    render(<AddProviderDialog />);

    const triggers = screen.getAllByRole("button", { name: "Add Provider" });
    await userEvent.click(triggers[0]);

    expect(screen.getByRole("heading", { name: "Add Provider" })).toBeTruthy();
  });

  it("updates form fields", async () => {
    render(<AddProviderDialog />);

    const triggers = screen.getAllByRole("button", { name: "Add Provider" });
    await userEvent.click(triggers[0]);

    const npiInput = screen.getByPlaceholderText("10-digit NPI") as HTMLInputElement;
    await userEvent.type(npiInput, "1234567890");
    expect(npiInput.value).toBe("1234567890");

    const nameInput = screen.getByPlaceholderText("Dr. Jane Smith") as HTMLInputElement;
    await userEvent.type(nameInput, "Dr. Test");
    expect(nameInput.value).toBe("Dr. Test");

    const specialtyInput = screen.getByPlaceholderText("Cardiology") as HTMLInputElement;
    await userEvent.type(specialtyInput, "Cardiology");
    expect(specialtyInput.value).toBe("Cardiology");

    const stateInput = screen.getByPlaceholderText("CA") as HTMLInputElement;
    await userEvent.type(stateInput, "NY");
    expect(stateInput.value).toBe("NY");

    const numberInput = screen.getByPlaceholderText("A12345") as HTMLInputElement;
    await userEvent.type(numberInput, "L123456");
    expect(numberInput.value).toBe("L123456");
  });

  it("submits with correct payload including license fields", async () => {
    const fetchMock = mock(() =>
      Promise.resolve({ ok: true, json: async () => ({ id: "p_new" }) } as Response)
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<AddProviderDialog />);

    const triggers = screen.getAllByRole("button", { name: "Add Provider" });
    await userEvent.click(triggers[0]);

    const npiInput = screen.getByPlaceholderText("10-digit NPI");
    await userEvent.type(npiInput, "1234567890");

    const nameInput = screen.getByPlaceholderText("Dr. Jane Smith");
    await userEvent.type(nameInput, "Dr. Test");

    const specialtyInput = screen.getByPlaceholderText("Cardiology");
    await userEvent.type(specialtyInput, "Cardiology");

    const stateInput = screen.getByPlaceholderText("CA");
    await userEvent.type(stateInput, "NY");

    const numberInput = screen.getByPlaceholderText("A12345");
    await userEvent.type(numberInput, "L123456");

    const dateInput = screen.getByDisplayValue("") as HTMLInputElement;
    await userEvent.type(dateInput, "2027-01-01");

    const buttons = screen.getAllByRole("button", { name: "Add Provider" });
    await userEvent.click(buttons[buttons.length - 1]);

    const calls = fetchMock.mock.calls as unknown as [string, RequestInit][];
    const callBody = JSON.parse(calls[0][1].body as string);
    expect(callBody).toEqual({
      npi: "1234567890",
      name: "Dr. Test",
      specialty: "Cardiology",
      status: "PENDING",
      licenseState: "NY",
      licenseNumber: "L123456",
      licenseExpiresAt: "2027-01-01",
    });
  });

  it("calls router.refresh() and closes dialog on success", async () => {
    const fetchMock = mock(() =>
      Promise.resolve({ ok: true, json: async () => ({ id: "p_new" }) } as Response)
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<AddProviderDialog />);

    const triggers = screen.getAllByRole("button", { name: "Add Provider" });
    await userEvent.click(triggers[0]);

    const npiInput = screen.getByPlaceholderText("10-digit NPI");
    await userEvent.type(npiInput, "1234567890");

    const nameInput = screen.getByPlaceholderText("Dr. Jane Smith");
    await userEvent.type(nameInput, "Dr. Test");

    const specialtyInput = screen.getByPlaceholderText("Cardiology");
    await userEvent.type(specialtyInput, "Cardiology");

    const stateInput = screen.getByPlaceholderText("CA");
    await userEvent.type(stateInput, "NY");

    const numberInput = screen.getByPlaceholderText("A12345");
    await userEvent.type(numberInput, "L123456");

    const dateInput = screen.getByDisplayValue("") as HTMLInputElement;
    await userEvent.type(dateInput, "2027-01-01");

    const buttons = screen.getAllByRole("button", { name: "Add Provider" });
    await userEvent.click(buttons[buttons.length - 1]);

    expect(refresh).toHaveBeenCalled();
  });

  it("shows error text on failed submit", async () => {
    const fetchMock = mock(() =>
      Promise.resolve({ ok: false, json: async () => ({ error: "Invalid NPI" }) } as Response)
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<AddProviderDialog />);

    const triggers = screen.getAllByRole("button", { name: "Add Provider" });
    await userEvent.click(triggers[0]);

    const npiInput = screen.getByPlaceholderText("10-digit NPI");
    await userEvent.type(npiInput, "1234567890");

    const nameInput = screen.getByPlaceholderText("Dr. Jane Smith");
    await userEvent.type(nameInput, "Dr. Test");

    const specialtyInput = screen.getByPlaceholderText("Cardiology");
    await userEvent.type(specialtyInput, "Cardiology");

    const stateInput = screen.getByPlaceholderText("CA");
    await userEvent.type(stateInput, "NY");

    const numberInput = screen.getByPlaceholderText("A12345");
    await userEvent.type(numberInput, "L123456");

    const dateInput = screen.getByDisplayValue("") as HTMLInputElement;
    await userEvent.type(dateInput, "2027-01-01");

    const buttons = screen.getAllByRole("button", { name: "Add Provider" });
    await userEvent.click(buttons[buttons.length - 1]);

    expect(screen.getByText("Invalid NPI")).toBeTruthy();
  });
});
