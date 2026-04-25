import { describe, it, expect, beforeEach } from "bun:test";
import { controls } from "@/lib/temporal/client";
import { GET } from "./route";

beforeEach(() => {
  controls.reset();
});

const callGet = (workflowId: string) =>
  GET(new Request(`http://localhost/api/workflows/${workflowId}`), {
    params: Promise.resolve({ workflowId }),
  });

describe("GET /api/workflows/:workflowId", () => {
  it("returns the seeded workflow shape for a credentialing id", async () => {
    const response = await callGet("cred_a");
    expect(response.status).toBe(200);
    const data = await response.json();

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

    const response = await callGet("cred_b");
    const data = await response.json();
    expect(data.currentStep).toBe("COMMITTEE_REVIEW");
  });

  it("returns 404 for unknown workflow id prefix", async () => {
    const response = await callGet("zzz_unknown");
    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toMatch(/Unknown workflow type/);
  });
});
