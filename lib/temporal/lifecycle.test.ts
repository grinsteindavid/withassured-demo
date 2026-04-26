import { describe, it, expect, beforeEach, mock, spyOn } from "bun:test";
import { mockTemporal, controls } from "./client";
import { startComplianceScheduler } from "./lifecycle";

beforeEach(() => {
  controls.reset();
});

describe("startComplianceScheduler", () => {
  it("creates compliance workflows for providers with ACTIVE licenses", async () => {
    const mockPrisma = {
      provider: {
        findMany: mock(async () => [
          { id: "provider_1", licenses: [{ status: "ACTIVE" }] },
          { id: "provider_2", licenses: [{ status: "ACTIVE" }] },
        ]),
      },
      complianceCheck: {
        create: mock(async (data: any) => ({ id: "check_new", ...data })),
      },
    };

    mock.module("@/lib/db", () => ({ prisma: mockPrisma }));

    const callbacks: (() => void)[] = [];
    const intervalSpy = spyOn(
      globalThis as unknown as { setInterval: (handler: () => void, ms?: number) => number },
      "setInterval",
    ).mockImplementation((cb: () => void) => {
      callbacks.push(cb);
      return 999;
    });

    startComplianceScheduler();
    expect(callbacks.length).toBe(1);

    // Execute the scheduler callback
    await callbacks[0]();

    // Verify workflows were created
    const handle1 = await mockTemporal.workflow.getHandle("comp_check_new");
    const info1 = await handle1.describe();
    expect(info1.status.name).toBe("RUNNING");

    intervalSpy.mockRestore();
    controls.reset();
  });

});
