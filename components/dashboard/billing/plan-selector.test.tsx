import { describe, it, expect, mock, beforeEach } from "bun:test";

const refresh = mock(() => {});

mock.module("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { PlanSelector } = await import("./plan-selector");

describe("<PlanSelector />", () => {
  const onClose = mock(() => {});

  beforeEach(() => {
    refresh.mockClear();
    onClose.mockClear();
  });

  it("renders all three plan cards", () => {
    render(<PlanSelector currentPlan={null} onClose={onClose} />);

    expect(screen.getByText("Startup")).toBeTruthy();
    expect(screen.getByText("Growth")).toBeTruthy();
    expect(screen.getByText("Enterprise")).toBeTruthy();
  });

  it("shows current plan badge", () => {
    render(<PlanSelector currentPlan="GROWTH" onClose={onClose} />);

    expect(screen.getByText("Current")).toBeTruthy();
  });

  it("selects a plan on click and highlights it", async () => {
    render(<PlanSelector currentPlan={null} onClose={onClose} />);

    const growthCard = screen.getByText("Growth").closest("div")!.closest("div")!;
    await userEvent.click(growthCard);

    const subscribeButton = screen.getAllByText("Subscribe").find(
      (btn) => btn.closest("div")?.textContent?.includes("Growth")
    );
    expect(subscribeButton).toBeTruthy();
  });

  it("disables subscribe button for current plan", () => {
    render(<PlanSelector currentPlan="STARTUP" onClose={onClose} />);

    const startupSubscribe = screen.getAllByRole("button").find(
      (btn) => btn.textContent === "Current Plan"
    );
    expect(startupSubscribe).toBeTruthy();
    expect((startupSubscribe as HTMLButtonElement).disabled).toBe(true);
  });

  it("subscribes to selected plan and calls onClose", async () => {
    const fetchMock = mock(() =>
      Promise.resolve({ ok: true } as Response)
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<PlanSelector currentPlan={null} onClose={onClose} />);

    const growthCard = screen.getByText("Growth").closest("div")!.closest("div")!;
    await userEvent.click(growthCard);

    const subscribeButtons = screen.getAllByText("Subscribe");
    const growthSubscribe = subscribeButtons[1];
    await userEvent.click(growthSubscribe);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/payments/subscription",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "GROWTH" }),
      })
    );
    expect(refresh).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when cancel clicked", async () => {
    render(<PlanSelector currentPlan={null} onClose={onClose} />);

    const cancelButton = screen.getByText("Cancel");
    await userEvent.click(cancelButton);

    expect(onClose).toHaveBeenCalled();
  });

  it("disables buttons while loading", async () => {
    let resolveFetch: (value: Response) => void;
    const fetchPromise = new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    });
    const fetchMock = mock(() => fetchPromise);
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<PlanSelector currentPlan={null} onClose={onClose} />);

    const growthCard = screen.getByText("Growth").closest("div")!.closest("div")!;
    await userEvent.click(growthCard);

    const subscribeButtons = screen.getAllByText("Subscribe");
    await userEvent.click(subscribeButtons[1]);

    const cancelButton = screen.getByText("Cancel") as HTMLButtonElement;
    expect(cancelButton.disabled).toBe(true);

    const growthSubscribe = subscribeButtons[1] as HTMLButtonElement;
    expect(growthSubscribe.disabled).toBe(true);

    resolveFetch!({ ok: true } as Response);
    await fetchPromise;
  });
});
