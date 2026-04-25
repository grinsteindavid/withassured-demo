import { describe, it, expect } from "bun:test";
import { historyToSteps, currentStep, fullStepList } from "./derive";
import type { HistoryEvent } from "./types";

const t = (iso: string) => new Date(iso);

const sample = (): HistoryEvent[] => [
  { eventId: 1, eventTime: t("2026-04-20T09:00:00Z"), eventType: "WorkflowExecutionStarted" },
  { eventId: 2, eventTime: t("2026-04-20T09:30:00Z"), eventType: "ActivityTaskScheduled", activityType: "PSV_EDUCATION" },
  { eventId: 3, eventTime: t("2026-04-20T09:31:00Z"), eventType: "ActivityTaskStarted", activityType: "PSV_EDUCATION", attempt: 1 },
  { eventId: 4, eventTime: t("2026-04-20T10:30:00Z"), eventType: "ActivityTaskCompleted", activityType: "PSV_EDUCATION" },
  { eventId: 5, eventTime: t("2026-04-20T10:31:00Z"), eventType: "ActivityTaskScheduled", activityType: "SANCTIONS_CHECK" },
  { eventId: 6, eventTime: t("2026-04-20T10:32:00Z"), eventType: "ActivityTaskStarted", activityType: "SANCTIONS_CHECK", attempt: 2 },
];

describe("historyToSteps", () => {
  it("returns empty for empty history", () => {
    expect(historyToSteps([])).toEqual([]);
  });

  it("derives COMPLETED with timestamp from Scheduled→Started→Completed", () => {
    const steps = historyToSteps(sample());
    const psv = steps.find((s) => s.name === "PSV_EDUCATION")!;
    expect(psv.status).toBe("COMPLETED");
    expect(psv.at).toBe("2026-04-20T10:30:00.000Z");
  });

  it("derives RUNNING with attempt for the in-flight step", () => {
    const steps = historyToSteps(sample());
    const sanctions = steps.find((s) => s.name === "SANCTIONS_CHECK")!;
    expect(sanctions.status).toBe("RUNNING");
    expect(sanctions.attempt).toBe(2);
  });

  it("derives FAILED from ActivityTaskFailed", () => {
    const events: HistoryEvent[] = [
      { eventId: 1, eventTime: t("2026-04-20T09:00:00Z"), eventType: "ActivityTaskScheduled", activityType: "X" },
      { eventId: 2, eventTime: t("2026-04-20T09:01:00Z"), eventType: "ActivityTaskStarted", activityType: "X", attempt: 1 },
      { eventId: 3, eventTime: t("2026-04-20T09:05:00Z"), eventType: "ActivityTaskFailed", activityType: "X", failure: { message: "boom" } },
    ];
    const [step] = historyToSteps(events);
    expect(step.status).toBe("FAILED");
    expect(step.at).toBe("2026-04-20T09:05:00.000Z");
  });

  it("preserves activity order from the history", () => {
    const steps = historyToSteps(sample());
    expect(steps.map((s) => s.name)).toEqual(["PSV_EDUCATION", "SANCTIONS_CHECK"]);
  });
});

describe("currentStep", () => {
  it("returns the running activity when one is in flight", () => {
    expect(currentStep(sample())).toBe("SANCTIONS_CHECK");
  });

  it("returns null when nothing is in flight or pending", () => {
    const allDone: HistoryEvent[] = [
      { eventId: 1, eventTime: t("2026-04-20T09:00:00Z"), eventType: "ActivityTaskScheduled", activityType: "ONLY" },
      { eventId: 2, eventTime: t("2026-04-20T09:01:00Z"), eventType: "ActivityTaskStarted", activityType: "ONLY", attempt: 1 },
      { eventId: 3, eventTime: t("2026-04-20T09:02:00Z"), eventType: "ActivityTaskCompleted", activityType: "ONLY" },
    ];
    expect(currentStep(allDone)).toBeNull();
  });

  it("returns the failed step's name", () => {
    const events: HistoryEvent[] = [
      { eventId: 1, eventTime: t("2026-04-20T09:00:00Z"), eventType: "ActivityTaskScheduled", activityType: "X" },
      { eventId: 2, eventTime: t("2026-04-20T09:01:00Z"), eventType: "ActivityTaskStarted", activityType: "X", attempt: 1 },
      { eventId: 3, eventTime: t("2026-04-20T09:05:00Z"), eventType: "ActivityTaskFailed", activityType: "X", failure: { message: "boom" } },
    ];
    expect(currentStep(events)).toBe("X");
  });
});

describe("fullStepList", () => {
  it("appends not-yet-scheduled definition steps as PENDING", () => {
    const steps = fullStepList(sample(), "credentialing");
    expect(steps.map((s) => `${s.name}:${s.status}`)).toEqual([
      "PSV_EDUCATION:COMPLETED",
      "SANCTIONS_CHECK:RUNNING",
      "APPLICATION_RECEIVED:PENDING",
      "PSV_DEA:PENDING",
      "COMMITTEE_REVIEW:PENDING",
      "APPROVED:PENDING",
    ]);
  });
});
