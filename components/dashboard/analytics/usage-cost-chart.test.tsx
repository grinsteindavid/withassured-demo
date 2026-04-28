import { describe, it, expect } from "bun:test";

import { render } from "@testing-library/react";

const { UsageCostChart } = await import("./usage-cost-chart");

describe("<UsageCostChart />", () => {
  it("renders area chart with usage cost data", () => {
    const data = [
      { month: "2026-01", credentialing: 19900, licensing: 9900, enrollment: 14900, monitoring: 2900 },
      { month: "2026-02", credentialing: 39800, licensing: 19800, enrollment: 29800, monitoring: 5800 },
      { month: "2026-03", credentialing: 59700, licensing: 29700, enrollment: 44700, monitoring: 8700 },
    ];

    const { container } = render(<UsageCostChart data={data} />);
    expect(container).toBeTruthy();
  });

  it("renders with empty data", () => {
    const { container } = render(<UsageCostChart data={[]} />);
    expect(container).toBeTruthy();
  });
});
