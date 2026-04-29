import { describe, it, expect } from "bun:test";

import { render } from "@testing-library/react";

const { WorkflowSuccessChart } = await import("./workflow-success-chart");

describe("<WorkflowSuccessChart />", () => {
  it("renders horizontal bar chart with workflow data", () => {
    const data = [
      { workflowType: "Credentialing", completed: 10, failed: 2, inProgress: 3 },
      { workflowType: "Licensing", completed: 8, failed: 1, inProgress: 4 },
      { workflowType: "Enrollment", completed: 15, failed: 3, inProgress: 5 },
      { workflowType: "Compliance", completed: 20, failed: 0, inProgress: 2 },
    ];

    const { container } = render(<WorkflowSuccessChart data={data} />);
    expect(container).toBeTruthy();
  });

  it("renders with empty data", () => {
    const { container } = render(<WorkflowSuccessChart data={[]} />);
    expect(container).toBeTruthy();
  });
});
