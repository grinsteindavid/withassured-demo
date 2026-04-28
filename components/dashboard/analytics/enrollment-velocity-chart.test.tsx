import { describe, it, expect } from "bun:test";

import { render } from "@testing-library/react";

const { EnrollmentVelocityChart } = await import("./enrollment-velocity-chart");

describe("<EnrollmentVelocityChart />", () => {
  it("renders composed chart with enrollment velocity data", () => {
    const data = [
      { payer: "Medicare", approvalRate: 95, avgDaysToApproval: 14 },
      { payer: "Medicaid", approvalRate: 88, avgDaysToApproval: 21 },
      { payer: "Blue Cross", approvalRate: 92, avgDaysToApproval: 18 },
    ];

    const { container } = render(<EnrollmentVelocityChart data={data} />);
    expect(container).toBeTruthy();
  });

  it("renders with empty data", () => {
    const { container } = render(<EnrollmentVelocityChart data={[]} />);
    expect(container).toBeTruthy();
  });
});
