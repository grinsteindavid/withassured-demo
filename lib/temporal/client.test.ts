import { describe, it, expect, beforeEach, spyOn } from "bun:test";
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

describe("controls.startAuto", () => {
  it("advances a workflow when the timer callback fires", async () => {
    const handle = mockTemporal.workflow.getHandle("cred_auto");
    await handle.describe();

    const callbacks: (() => void)[] = [];
    const timeoutSpy = spyOn(
      globalThis as unknown as { setTimeout: (handler: () => void, ms?: number) => number },
      "setTimeout",
    ).mockImplementation((cb: () => void) => {
      callbacks.push(cb);
      return 999;
    });
    const randomSpy = spyOn(Math, "random").mockReturnValue(0.5); // > 0.2 => advance

    controls.startAuto("cred_auto");
    expect(callbacks.length).toBe(1);

    callbacks[0]();

    const { events } = await handle.fetchHistory();
    const completed = events
      .filter((e) => e.eventType === "ActivityTaskCompleted")
      .map((e) => e.activityType);
    expect(completed).toContain("SANCTIONS_CHECK");

    timeoutSpy.mockRestore();
    randomSpy.mockRestore();
    controls.stopAuto("cred_auto");
  });

  it("fails a workflow when Math.random() < 0.1", async () => {
    const handle = mockTemporal.workflow.getHandle("cred_auto_fail");
    await handle.describe();

    const callbacks: (() => void)[] = [];
    const timeoutSpy = spyOn(
      globalThis as unknown as { setTimeout: (handler: () => void, ms?: number) => number },
      "setTimeout",
    ).mockImplementation((cb: () => void) => {
      callbacks.push(cb);
      return 888;
    });
    const randomSpy = spyOn(Math, "random").mockReturnValue(0.05); // < 0.1 => fail

    controls.startAuto("cred_auto_fail");
    callbacks[0]();

    const info = await handle.describe();
    expect(info.status.name).toBe("FAILED");

    timeoutSpy.mockRestore();
    randomSpy.mockRestore();
    controls.stopAuto("cred_auto_fail");
  });
});

describe("controls.stopAuto", () => {
  it("calls clearTimeout for the workflow timer", async () => {
    const handle = mockTemporal.workflow.getHandle("cred_stop");
    await handle.describe();

    const clearSpy = spyOn(
      globalThis as unknown as { clearTimeout: (id: number) => void },
      "clearTimeout",
    ).mockImplementation(() => {});

    controls.startAuto("cred_stop");
    controls.stopAuto("cred_stop");

    expect(clearSpy).toHaveBeenCalled();

    clearSpy.mockRestore();
  });
});

describe("controls.enableAutoPlay / disableAutoPlay", () => {
  it("starts timers for all RUNNING workflows when enabled", async () => {
    const handle1 = mockTemporal.workflow.getHandle("cred_e1");
    const handle2 = mockTemporal.workflow.getHandle("enr_e2");
    await handle1.describe();
    await handle2.describe();

    controls.reset();
    // Re-seed after reset (auto-play disabled by reset)
    await handle1.describe();
    await handle2.describe();

    let callCount = 0;
    const timeoutSpy = spyOn(
      globalThis as unknown as { setTimeout: (handler: () => void, ms?: number) => number },
      "setTimeout",
    ).mockImplementation(() => {
      callCount++;
      return 777;
    });

    controls.enableAutoPlay();
    expect(callCount).toBe(2);

    timeoutSpy.mockRestore();
    controls.reset();
  });

  it("disableAutoPlay stops all active timers", async () => {
    const handle = mockTemporal.workflow.getHandle("cred_d1");
    await handle.describe();

    const clearSpy = spyOn(
      globalThis as unknown as { clearTimeout: (id: number) => void },
      "clearTimeout",
    ).mockImplementation(() => {});

    controls.enableAutoPlay();
    controls.disableAutoPlay();

    expect(clearSpy).toHaveBeenCalled();

    clearSpy.mockRestore();
    controls.reset();
  });
});
