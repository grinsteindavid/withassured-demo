import { describe, it, expect } from "bun:test";

import { render } from "@testing-library/react";

const { LicenseExpirationChart } = await import("./license-expiration-chart");

describe("<LicenseExpirationChart />", () => {
  it("renders bar chart with license expiration buckets", () => {
    const data = [
      { bucket: "0-30 days", count: 5 },
      { bucket: "30-60 days", count: 8 },
      { bucket: "60-90 days", count: 12 },
      { bucket: "90-180 days", count: 15 },
      { bucket: "180+ days", count: 20 },
    ];

    const { container } = render(<LicenseExpirationChart data={data} />);
    expect(container).toBeTruthy();
  });

  it("renders with empty data", () => {
    const { container } = render(<LicenseExpirationChart data={[]} />);
    expect(container).toBeTruthy();
  });
});
