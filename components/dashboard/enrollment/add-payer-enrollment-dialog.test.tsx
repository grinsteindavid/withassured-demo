import { describe, it, expect, mock } from "bun:test";

const refresh = mock(() => {});

mock.module("next/navigation", () => ({
  useRouter: () => ({ push: mock(() => {}), refresh }),
}));

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { AddPayerEnrollmentDialog } = await import("./add-payer-enrollment-dialog");

const activeSubscription = {
  id: "sub_1",
  customer: "org_1",
  plan: "STARTUP" as const,
  status: "ACTIVE" as const,
  currentPeriodStart: new Date().toISOString(),
  currentPeriodEnd: new Date().toISOString(),
  cancelAtPeriodEnd: false,
  created_at: new Date().toISOString(),
};

describe("<AddPayerEnrollmentDialog />", () => {
  const providers = [
    { id: "prov_1", name: "Dr. Smith" },
    { id: "prov_2", name: "Dr. Jones" },
  ];

  it("renders subscribe button when subscription is inactive", () => {
    render(
      <AddPayerEnrollmentDialog subscription={{ ...activeSubscription, status: "CANCELED" as const }} providers={providers} />,
    );

    expect(screen.getByRole("link", { name: "Subscribe to add enrollments" })).toBeTruthy();
  });

  it("renders dialog trigger when subscription is active", () => {
    render(
      <AddPayerEnrollmentDialog subscription={activeSubscription} providers={providers} />,
    );

    expect(screen.getByRole("button", { name: "Add Payer Enrollment" })).toBeTruthy();
  });

  it("shows provider options in dropdown", async () => {
    render(
      <AddPayerEnrollmentDialog subscription={activeSubscription} providers={providers} />,
    );

    const triggers = screen.getAllByRole("button", { name: "Add Payer Enrollment" });
    await userEvent.click(triggers[0]);

    expect(screen.getByText("Dr. Smith")).toBeTruthy();
    expect(screen.getByText("Dr. Jones")).toBeTruthy();
  });

  it("submits with correct payload", async () => {
    const fetchMock = mock(() =>
      Promise.resolve({ ok: true, json: async () => ({ id: "enr_new" }) } as Response),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    render(
      <AddPayerEnrollmentDialog subscription={activeSubscription} providers={providers} />,
    );

    const triggers = screen.getAllByRole("button", { name: "Add Payer Enrollment" });
    await userEvent.click(triggers[0]);

    const select = screen.getByDisplayValue("Select a provider") as HTMLSelectElement;
    await userEvent.selectOptions(select, "prov_1");

    const payerInput = screen.getByPlaceholderText("Blue Cross") as HTMLInputElement;
    await userEvent.type(payerInput, "Aetna");

    const stateInput = screen.getByPlaceholderText("CA") as HTMLInputElement;
    await userEvent.type(stateInput, "NY");

    const buttons = screen.getAllByRole("button", { name: "Add Enrollment" });
    await userEvent.click(buttons[buttons.length - 1]);

    const calls = fetchMock.mock.calls as unknown as [string, RequestInit][];
    const callBody = JSON.parse(calls[0][1].body as string);
    expect(callBody.providerId).toBe("prov_1");
    expect(callBody.payer).toBe("Aetna");
    expect(callBody.state).toBe("NY");
  });
});
