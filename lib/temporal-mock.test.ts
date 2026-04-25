import { describe, it, expect } from "bun:test";
import { getWorkflow } from "./temporal-mock";

describe("getWorkflow", () => {
  it("returns credentialing workflow for cred_ prefix", () => {
    const workflow = getWorkflow("cred_01H123");
    expect(workflow.type).toBe("credentialing");
    expect(workflow.status).toBe("RUNNING");
    expect(workflow.currentStep).toBe("SANCTIONS_CHECK");
    expect(workflow.steps.length).toBeGreaterThan(0);
  });

  it("returns license workflow for lic_ prefix", () => {
    const workflow = getWorkflow("lic_01");
    expect(workflow.type).toBe("license");
    expect(workflow.status).toBe("RUNNING");
    expect(workflow.currentStep).toBe("STATE_REVIEW");
  });

  it("returns enrollment workflow for enr_ prefix", () => {
    const workflow = getWorkflow("enr_01");
    expect(workflow.type).toBe("enrollment");
    expect(workflow.status).toBe("RUNNING");
    expect(workflow.currentStep).toBe("FOLLOW_UP");
  });

  it("throws error for unknown prefix", () => {
    expect(() => getWorkflow("unknown_01")).toThrow("Unknown workflow type");
  });
});
