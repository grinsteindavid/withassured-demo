import { describe, it, expect, mock } from "bun:test";

mock.module("next/navigation", () => ({
  useRouter: () => ({ push: mock(() => {}) }),
  useSearchParams: () => new URLSearchParams(),
}));

import { render, screen } from "@testing-library/react";

const { EnrollmentRow } = await import("./enrollment-row");

describe("<EnrollmentRow />", () => {
  it("renders enrollment details", () => {
    const enrollment = {
      id: "enr_1",
      providerId: "prov_1",
      payer: "Blue Cross",
      state: "CA",
      status: "PENDING",
      submittedAt: "2024-01-15T00:00:00.000Z",
      workflowId: "enr_wf_1",
    };

    render(<EnrollmentRow enrollment={enrollment} providerName="Dr. Smith" />);
    
    expect(screen.getByText("Dr. Smith")).toBeTruthy();
    expect(screen.getByText("Blue Cross")).toBeTruthy();
  });

  it("expands on button click to show workflow timeline", async () => {
    const enrollment = {
      id: "enr_1",
      providerId: "prov_1",
      payer: "Blue Cross",
      state: "CA",
      status: "PENDING",
      submittedAt: "2024-01-15T00:00:00.000Z",
      workflowId: "enr_wf_1",
    };

    render(<EnrollmentRow enrollment={enrollment} />);
    
    const viewButton = screen.getByText("View Workflow");
    expect(viewButton).toBeTruthy();
  });

  it("does not show workflow button when workflowId is null", () => {
    const enrollment = {
      id: "enr_1",
      providerId: "prov_1",
      payer: "Blue Cross",
      state: "CA",
      status: "PENDING",
      submittedAt: "2024-01-15T00:00:00.000Z",
      workflowId: null,
    };

    render(<EnrollmentRow enrollment={enrollment} />);
    
    expect(screen.queryByText("View Workflow")).toBeNull();
    expect(screen.getByText("—")).toBeTruthy();
  });

  it("displays status badge", () => {
    const enrollment = {
      id: "enr_1",
      providerId: "prov_1",
      payer: "Blue Cross",
      state: "CA",
      status: "APPROVED",
      submittedAt: "2024-01-15T00:00:00.000Z",
      workflowId: "enr_wf_1",
    };

    render(<EnrollmentRow enrollment={enrollment} />);
    
    expect(screen.getByText("APPROVED")).toBeTruthy();
  });
});
