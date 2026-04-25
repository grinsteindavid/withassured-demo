import { describe, it, expect, beforeEach } from "bun:test";
import { mockTemporal, controls } from "./client";

beforeEach(() => {
  controls.reset();
});

describe("mockTemporal.workflow.getHandle().describe()", () => {
  it("seeds RUNNING state for a credentialing workflow on first access", async () => {
    const handle = mockTemporal.workflow.getHandle("cred_01");
    const info = await handle.describe();

    expect(info.workflowId).toBe("cred_01");
    expect(info.type).toBe("credentialing");
    expect(info.status.name).toBe("RUNNING");
    expect(info.taskQueue).toBe("credentialing-tq");
    expect(info.startTime).toBeInstanceOf(Date);
    expect(info.historyLength).toBeGreaterThan(0);
  });

  it("throws on unknown workflow id prefix", async () => {
    await expect(mockTemporal.workflow.getHandle("zzz_01").describe()).rejects.toThrow();
  });
});

describe("mockTemporal.workflow.getHandle().fetchHistory()", () => {
  it("returns Temporal-shaped history with the seeded step running", async () => {
    const handle = mockTemporal.workflow.getHandle("cred_01");
    const { events } = await handle.fetchHistory();

    expect(events[0].eventType).toBe("WorkflowExecutionStarted");
    const lastStarted = [...events].reverse().find((e) => e.eventType === "ActivityTaskStarted");
    expect(lastStarted?.activityType).toBe("SANCTIONS_CHECK");
    const completedNames = events
      .filter((e) => e.eventType === "ActivityTaskCompleted")
      .map((e) => e.activityType);
    expect(completedNames).toEqual(["APPLICATION_RECEIVED", "PSV_EDUCATION", "PSV_DEA"]);
  });
});

describe("controls.advance", () => {
  it("flips the current activity to COMPLETED and starts the next one", async () => {
    const handle = mockTemporal.workflow.getHandle("cred_01");
    await handle.describe(); // seed
    controls.advance("cred_01");

    const { events } = await handle.fetchHistory();
    const completed = events.filter((e) => e.eventType === "ActivityTaskCompleted").map((e) => e.activityType);
    expect(completed).toContain("SANCTIONS_CHECK");

    const lastStarted = [...events].reverse().find((e) => e.eventType === "ActivityTaskStarted");
    expect(lastStarted?.activityType).toBe("COMMITTEE_REVIEW");
  });

  it("transitions workflow to COMPLETED after advancing past the last step", async () => {
    const id = "lic_demo";
    const handle = mockTemporal.workflow.getHandle(id);
    await handle.describe(); // license: 2 done, STATE_REVIEW running, ISSUED next
    controls.advance(id); // STATE_REVIEW done, ISSUED running
    controls.advance(id); // ISSUED done, workflow complete

    const info = await handle.describe();
    expect(info.status.name).toBe("COMPLETED");
    expect(info.closeTime).toBeInstanceOf(Date);

    const { events } = await handle.fetchHistory();
    expect(events.at(-1)?.eventType).toBe("WorkflowExecutionCompleted");
  });

  it("is a no-op for already-completed workflows", async () => {
    const id = "enr_done";
    const handle = mockTemporal.workflow.getHandle(id);
    await handle.describe();
    // enrollment seed: 2 done + FOLLOW_UP running, APPROVED pending → 2 advances finish it
    controls.advance(id);
    controls.advance(id);
    const before = (await handle.fetchHistory()).events.length;
    controls.advance(id);
    const after = (await handle.fetchHistory()).events.length;
    expect(after).toBe(before);
  });
});

describe("controls.fail", () => {
  it("marks the running activity FAILED and the workflow FAILED", async () => {
    const handle = mockTemporal.workflow.getHandle("cred_fail");
    await handle.describe();
    controls.fail("cred_fail", "sanctions hit");

    const info = await handle.describe();
    expect(info.status.name).toBe("FAILED");
    expect(info.closeTime).toBeInstanceOf(Date);

    const { events } = await handle.fetchHistory();
    const failed = events.find((e) => e.eventType === "ActivityTaskFailed");
    expect(failed?.activityType).toBe("SANCTIONS_CHECK");
    expect(failed?.failure?.message).toBe("sanctions hit");
  });
});

describe("controls.reset", () => {
  it("clears stored state so the next describe re-seeds", async () => {
    const handle = mockTemporal.workflow.getHandle("cred_resettable");
    await handle.describe();
    controls.advance("cred_resettable");
    const before = (await handle.fetchHistory()).events.length;

    controls.reset();
    const after = (await handle.fetchHistory()).events.length;
    expect(after).toBeLessThan(before);
  });
});
