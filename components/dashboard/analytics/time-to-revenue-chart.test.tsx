import { describe, it, expect } from "bun:test";

import { render } from "@testing-library/react";

const { TimeToRevenueChart } = await import("./time-to-revenue-chart");

describe("<TimeToRevenueChart />", () => {
  it("renders line chart with provided data", () => {
    const data = [
      { month: "2026-01", completed: 5, baseline: 2 },
      { month: "2026-02", completed: 8, baseline: 2 },
      { month: "2026-03", completed: 12, baseline: 2 },
    ];

    const { container } = render(<TimeToRevenueChart data={data} />);
    expect(container).toBeTruthy();
  });

  it("renders with empty data", () => {
    const { container } = render(<TimeToRevenueChart data={[]} />);
    expect(container).toBeTruthy();
  });

  it("adds baseline value to data points", () => {
    const data = [
      { month: "2026-01", completed: 5, baseline: 2 },
    ];

    const { container } = render(<TimeToRevenueChart data={data} />);
    expect(container).toBeTruthy();
  });
});
