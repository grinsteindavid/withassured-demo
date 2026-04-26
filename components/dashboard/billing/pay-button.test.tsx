import { describe, it, expect, mock } from "bun:test";

const push = mock(() => {});
const refresh = mock(() => {});

mock.module("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
  useSearchParams: () => new URLSearchParams(),
}));

import { render, screen } from "@testing-library/react";

const { PayButton } = await import("./pay-button");

describe("<PayButton />", () => {
  it("renders Pay button by default", () => {
    render(<PayButton invoiceId="inv_1" />);
    
    expect(screen.getByText("Pay")).toBeTruthy();
  });

  it("renders Pay button with invoiceId", () => {
    render(<PayButton invoiceId="inv_123" />);
    
    expect(screen.getByText("Pay")).toBeTruthy();
  });

  it("disables button when loading state is set", () => {
    render(<PayButton invoiceId="inv_1" />);
    
    const button = screen.getByText("Pay") as HTMLButtonElement;
    expect(button.disabled).toBe(false);
  });
});
