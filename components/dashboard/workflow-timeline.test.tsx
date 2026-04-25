import { describe, it, expect } from "bun:test";
import { render, screen } from "@testing-library/react";
import { WorkflowTimeline } from "./workflow-timeline";

describe("WorkflowTimeline", () => {
  it("renders completed step", () => {
    const steps = [{ name: "TEST", status: "COMPLETED" as const, at: "2026-04-20T09:00:00Z" }];
    render(<WorkflowTimeline steps={steps} />);
    expect(screen.getByText("TEST")).toBeInTheDocument();
  });

  it("renders running step", () => {
    const steps = [{ name: "RUNNING", status: "RUNNING" as const }];
    render(<WorkflowTimeline steps={steps} />);
    expect(screen.getByText("RUNNING")).toBeInTheDocument();
  });

  it("renders pending step", () => {
    const steps = [{ name: "PENDING", status: "PENDING" as const }];
    render(<WorkflowTimeline steps={steps} />);
    expect(screen.getByText("PENDING")).toBeInTheDocument();
  });
});
