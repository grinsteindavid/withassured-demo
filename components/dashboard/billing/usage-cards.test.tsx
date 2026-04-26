import { describe, it, expect } from "bun:test";

import { render, screen } from "@testing-library/react";

const { UsageCards } = await import("./usage-cards");

describe("<UsageCards />", () => {
  it("renders usage line cards with formatted values", () => {
    const lines = [
      { type: "CREDENTIALING", count: 5, unitCents: 1000, subtotalCents: 5000 },
      { type: "ENROLLMENT", count: 3, unitCents: 2500, subtotalCents: 7500 },
    ];

    render(
      <UsageCards
        lines={lines}
        platformFeeCents={500}
        totalCents={13000}
      />
    );
    
    expect(screen.getByText("CREDENTIALING")).toBeTruthy();
    expect(screen.getByText("ENROLLMENT")).toBeTruthy();
    expect(screen.getByText("$50.00")).toBeTruthy();
    expect(screen.getByText("$75.00")).toBeTruthy();
  });

  it("renders platform fee card", () => {
    const lines = [{ type: "CREDENTIALING", count: 1, unitCents: 1000, subtotalCents: 1000 }];

    render(
      <UsageCards
        lines={lines}
        platformFeeCents={500}
        totalCents={1500}
      />
    );
    
    expect(screen.getByText("Platform Fee")).toBeTruthy();
    expect(screen.getByText("$5.00")).toBeTruthy();
    expect(screen.getByText("Monthly")).toBeTruthy();
  });

  it("renders total due section", () => {
    const lines = [{ type: "CREDENTIALING", count: 1, unitCents: 1000, subtotalCents: 1000 }];

    render(
      <UsageCards
        lines={lines}
        platformFeeCents={500}
        totalCents={1500}
      />
    );
    
    expect(screen.getByText("Total Due")).toBeTruthy();
    expect(screen.getByText("$15.00")).toBeTruthy();
  });

  it("formats cents to dollars with proper locale", () => {
    const lines = [{ type: "CREDENTIALING", count: 10, unitCents: 999, subtotalCents: 9990 }];

    render(
      <UsageCards
        lines={lines}
        platformFeeCents={0}
        totalCents={9990}
      />
    );
    
    expect(screen.getAllByText("$99.90")).toHaveLength(2);
  });
});
