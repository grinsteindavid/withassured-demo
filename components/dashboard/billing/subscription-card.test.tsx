import { describe, it, expect, mock, beforeEach } from "bun:test";

const refresh = mock(() => {});

mock.module("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { SubscriptionCard } = await import("./subscription-card");

describe("<SubscriptionCard />", () => {
  beforeEach(() => {
    refresh.mockClear();
  });

  it("renders no subscription state with subscribe button", () => {
    render(<SubscriptionCard subscription={null} />);

    expect(screen.getByText("Subscription")).toBeTruthy();
    expect(screen.getByText("No active subscription")).toBeTruthy();
    expect(screen.getByText("Subscribe")).toBeTruthy();
  });

  it("renders active subscription details", () => {
    const subscription = {
      id: "sub_1",
      customer: "cust_1",
      plan: "GROWTH" as const,
      status: "ACTIVE" as const,
      currentPeriodStart: "2024-01-01T00:00:00Z",
      currentPeriodEnd: "2024-02-01T00:00:00Z",
      cancelAtPeriodEnd: false,
      created_at: "2024-01-01T00:00:00Z",
    };

    render(<SubscriptionCard subscription={subscription} />);

    expect(screen.getByText("Growth")).toBeTruthy();
    expect(screen.getByText("ACTIVE")).toBeTruthy();
    expect(screen.getByText(/Current period ends:/)).toBeTruthy();
    expect(screen.getByText("Change Plan")).toBeTruthy();
  });

  it("calls upgrade API on change plan click", async () => {
    const fetchMock = mock(() =>
      Promise.resolve({ ok: true } as Response)
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const subscription = {
      id: "sub_1",
      customer: "cust_1",
      plan: "STARTUP" as const,
      status: "ACTIVE" as const,
      currentPeriodStart: "2024-01-01T00:00:00Z",
      currentPeriodEnd: "2024-02-01T00:00:00Z",
      cancelAtPeriodEnd: false,
      created_at: "2024-01-01T00:00:00Z",
    };

    render(<SubscriptionCard subscription={subscription} />);

    const changePlanButton = screen.getByText("Change Plan");
    await userEvent.click(changePlanButton);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/payments/subscription",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "GROWTH" }),
      })
    );
    expect(refresh).toHaveBeenCalled();
  });

  it("calls cancel API and refreshes on cancel click", async () => {
    const fetchMock = mock(() =>
      Promise.resolve({ ok: true } as Response)
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const subscription = {
      id: "sub_1",
      customer: "cust_1",
      plan: "GROWTH" as const,
      status: "ACTIVE" as const,
      currentPeriodStart: "2024-01-01T00:00:00Z",
      currentPeriodEnd: "2024-02-01T00:00:00Z",
      cancelAtPeriodEnd: false,
      created_at: "2024-01-01T00:00:00Z",
    };

    render(<SubscriptionCard subscription={subscription} />);

    const cancelButton = screen.getByText("Cancel Subscription");
    await userEvent.click(cancelButton);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/payments/subscription/cancel",
      { method: "POST" }
    );
    expect(refresh).toHaveBeenCalled();
  });

  it("shows cancellation scheduled message when cancelAtPeriodEnd is true", () => {
    const subscription = {
      id: "sub_1",
      customer: "cust_1",
      plan: "GROWTH" as const,
      status: "ACTIVE" as const,
      currentPeriodStart: "2024-01-01T00:00:00Z",
      currentPeriodEnd: "2024-02-01T00:00:00Z",
      cancelAtPeriodEnd: true,
      created_at: "2024-01-01T00:00:00Z",
    };

    render(<SubscriptionCard subscription={subscription} />);

    expect(screen.getByText(/Cancellation scheduled:/)).toBeTruthy();
    expect(screen.getByText(/Will cancel on/)).toBeTruthy();
    expect(screen.queryByText("Cancel Subscription")).toBeNull();
  });

  it("shows past due status with destructive badge", () => {
    const subscription = {
      id: "sub_1",
      customer: "cust_1",
      plan: "STARTUP" as const,
      status: "PAST_DUE" as const,
      currentPeriodStart: "2024-01-01T00:00:00Z",
      currentPeriodEnd: "2024-02-01T00:00:00Z",
      cancelAtPeriodEnd: false,
      created_at: "2024-01-01T00:00:00Z",
    };

    render(<SubscriptionCard subscription={subscription} />);

    expect(screen.getByText("PAST_DUE")).toBeTruthy();
    expect(screen.getByText("Startup")).toBeTruthy();
  });

  it("shows canceled status with secondary badge", () => {
    const subscription = {
      id: "sub_1",
      customer: "cust_1",
      plan: "ENTERPRISE" as const,
      status: "CANCELED" as const,
      currentPeriodStart: "2024-01-01T00:00:00Z",
      currentPeriodEnd: "2024-02-01T00:00:00Z",
      cancelAtPeriodEnd: false,
      created_at: "2024-01-01T00:00:00Z",
    };

    render(<SubscriptionCard subscription={subscription} />);

    expect(screen.getByText("CANCELED")).toBeTruthy();
    expect(screen.getByText("Enterprise")).toBeTruthy();
  });
});
