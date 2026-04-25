import { describe, it, expect, beforeEach } from "bun:test";
import { controls } from "@/lib/temporal/client";
import { getWorkflowState } from "./workflows";

beforeEach(() => {
  controls.reset();
});

const callGet = (workflowId: string) => getWorkflowState(workflowId);

describe("getWorkflowState", () => {
  it("returns the seeded workflow shape for a credentialing id", async () => {
    const data = await callGet("cred_a");

    expect(data.workflowId).toBe("cred_a");
    expect(data.type).toBe("credentialing");
    expect(data.status).toBe("RUNNING");
    expect(data.currentStep).toBe("SANCTIONS_CHECK");
    expect(data.steps.map((s: { name: string; status: string }) => `${s.name}:${s.status}`)).toEqual([
      "APPLICATION_RECEIVED:COMPLETED",
      "PSV_EDUCATION:COMPLETED",
      "PSV_DEA:COMPLETED",
      "SANCTIONS_CHECK:RUNNING",
      "COMMITTEE_REVIEW:PENDING",
      "APPROVED:PENDING",
    ]);
  });

  it("reflects state changes after controls.advance()", async () => {
    await callGet("cred_b"); // seed
    controls.advance("cred_b");

    const data = await callGet("cred_b");
    expect(data.currentStep).toBe("COMMITTEE_REVIEW");
  });

  it("throws for unknown workflow id prefix", async () => {
    await expect(callGet("zzz_unknown")).rejects.toThrow(/Unknown workflow type/);
  });
});
