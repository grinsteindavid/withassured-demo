import { describe, it, expect, mock } from "bun:test";

const workflowFindUnique = mock(async () => ({
  id: "cred_test",
  type: "credentialing",
  status: "RUNNING",
  steps: [
    { name: "APPLICATION_RECEIVED", status: "COMPLETED", at: "2026-04-27T00:00:00Z" },
    { name: "PSV_EDUCATION", status: "COMPLETED", at: "2026-04-27T00:00:00Z" },
    { name: "PSV_DEA", status: "COMPLETED", at: "2026-04-27T00:00:00Z" },
    { name: "SANCTIONS_CHECK", status: "RUNNING", at: "2026-04-27T00:00:00Z" },
    { name: "COMMITTEE_REVIEW", status: "PENDING" },
    { name: "APPROVED", status: "PENDING" },
  ],
  startedAt: new Date(),
  runId: null,
  closedAt: null,
  updatedAt: new Date(),
}));

mock.module("@/lib/db", () => ({
  prisma: { workflow: { findUnique: workflowFindUnique } },
}));

const { getWorkflowState } = await import("./workflows");

describe("getWorkflowState", () => {
  it("returns the workflow shape from the DB", async () => {
    workflowFindUnique.mockClear();
    const data = await getWorkflowState("cred_test");

    expect(data.workflowId).toBe("cred_test");
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

  it("throws for unknown workflow id prefix", async () => {
    workflowFindUnique.mockResolvedValueOnce(null as never);
    await expect(getWorkflowState("zzz_unknown")).rejects.toThrow(/Workflow not found/);
  });
});
