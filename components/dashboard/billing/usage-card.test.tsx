import { describe, it, expect } from "bun:test";

import { render, screen } from "@testing-library/react";

const { UsageCard } = await import("./usage-card");

describe("<UsageCard />", () => {
  it("renders title, count, and pricing information", () => {
    render(
      <UsageCard
        title="Credentialing"
        count={5}
        unitCents={1000}
        subtotalCents={5000}
      />
    );
    
    expect(screen.getByText("Credentialing")).toBeTruthy();
    expect(screen.getByText("5")).toBeTruthy();
    expect(screen.getByText("$50 (5 × $10)")).toBeTruthy();
  });

  it("formats cents to dollars correctly", () => {
    render(
      <UsageCard
        title="Enrollment"
        count={3}
        unitCents={2500}
        subtotalCents={7500}
      />
    );
    
    expect(screen.getByText("$75 (3 × $25)")).toBeTruthy();
  });
});
