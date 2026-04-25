import { describe, it, expect, beforeEach } from "bun:test";
import { mockTemporal, controls } from "@/lib/temporal/client";
import { POST } from "./route";

beforeEach(() => {
  controls.reset();
});

const callPost = (workflowId: string) =>
  POST(new Request(`http://localhost/api/_dev/workflows/${workflowId}/advance`, { method: "POST" }), {
    params: Promise.resolve({ workflowId }),
  });

describe("POST /api/_dev/workflows/:workflowId/advance", () => {
  it("advances the workflow and returns 204", async () => {
    await mockTemporal.workflow.getHandle("cred_advance").describe(); // seed
    const response = await callPost("cred_advance");

    expect(response.status).toBe(204);

    const { events } = await mockTemporal.workflow.getHandle("cred_advance").fetchHistory();
    const lastStarted = [...events].reverse().find((e) => e.eventType === "ActivityTaskStarted");
    expect(lastStarted?.activityType).toBe("COMMITTEE_REVIEW");
  });

  it("returns 404 in production", async () => {
    const original = process.env.NODE_ENV;
    Object.defineProperty(process.env, "NODE_ENV", { value: "production", configurable: true });
    try {
      const response = await callPost("cred_prod");
      expect(response.status).toBe(404);
    } finally {
      Object.defineProperty(process.env, "NODE_ENV", { value: original, configurable: true });
    }
  });
});
