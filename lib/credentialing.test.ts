import { describe, it, expect, mock, beforeEach } from "bun:test";
import { controls } from "@/lib/temporal/client";

const findMany = mock(async (_args: unknown) => [] as unknown[]);
const findUnique = mock(async (_args: unknown) => null as unknown);

mock.module("@/lib/db", () => ({
  prisma: { provider: { findMany, findUnique } },
}));

const { listCredentialingCases, getCredentialingCaseDetail } = await import("./credentialing");

const fakeProvider = (over: Partial<{ id: string; name: string; specialty: string; npi: string; workflowId: string }> = {}) => ({
  id: over.id ?? "p_1",
  name: over.name ?? "Dr. Mock",
  specialty: over.specialty ?? "Cardiology",
  npi: over.npi ?? "1234567890",
  status: "ACTIVE",
  orgId: "org_test",
  credentialingCase: {
    id: "cc_1",
    providerId: over.id ?? "p_1",
    workflowId: over.workflowId ?? "cred_p1",
    status: "IN_PROGRESS",
  },
});

beforeEach(() => {
  controls.reset();
  findMany.mockReset();
  findUnique.mockReset();
});

describe("listCredentialingCases", () => {
  it("returns one summary per provider with an attached case, with derived currentStep", async () => {
    findMany.mockResolvedValueOnce([
      fakeProvider({ id: "p_1", name: "Dr. Alice", workflowId: "cred_alice" }),
      fakeProvider({ id: "p_2", name: "Dr. Bob", workflowId: "cred_bob" }),
    ]);

    const cases = await listCredentialingCases("org_test");

    expect(cases).toHaveLength(2);
    expect(cases[0].providerName).toBe("Dr. Alice");
    expect(cases[0].workflowId).toBe("cred_alice");
    expect(cases[0].status).toBe("RUNNING");
    expect(cases[0].currentStep).toBe("SANCTIONS_CHECK");
  });

  it("queries only providers with a credentialing case attached", async () => {
    findMany.mockResolvedValueOnce([]);
    await listCredentialingCases("org_test");
    expect(findMany).toHaveBeenCalledWith({
      where: { credentialingCase: { isNot: null }, orgId: "org_test" },
      include: { credentialingCase: true },
      orderBy: { name: "asc" },
    });
  });

  it("reflects state changes after controls.advance()", async () => {
    findMany.mockResolvedValueOnce([fakeProvider({ workflowId: "cred_advance_test" })]);
    await listCredentialingCases("org_test");

    controls.advance("cred_advance_test");

    findMany.mockResolvedValueOnce([fakeProvider({ workflowId: "cred_advance_test" })]);
    const after = await listCredentialingCases("org_test");
    expect(after[0].currentStep).toBe("COMMITTEE_REVIEW");
  });
});

describe("getCredentialingCaseDetail", () => {
  it("returns full detail with steps when the provider has a case", async () => {
    findUnique.mockResolvedValueOnce(fakeProvider({ id: "p_42", workflowId: "cred_42" }));

    const detail = await getCredentialingCaseDetail("p_42", "org_test");

    expect(detail).not.toBeNull();
    expect(detail!.providerId).toBe("p_42");
    expect(detail!.workflowId).toBe("cred_42");
    expect(detail!.steps.map((s) => `${s.name}:${s.status}`)).toEqual([
      "APPLICATION_RECEIVED:COMPLETED",
      "PSV_EDUCATION:COMPLETED",
      "PSV_DEA:COMPLETED",
      "SANCTIONS_CHECK:RUNNING",
      "COMMITTEE_REVIEW:PENDING",
      "APPROVED:PENDING",
    ]);
  });

  it("returns null when the provider does not exist", async () => {
    findUnique.mockResolvedValueOnce(null);
    expect(await getCredentialingCaseDetail("missing", "org_test")).toBeNull();
  });

  it("returns null when the provider has no credentialing case", async () => {
    findUnique.mockResolvedValueOnce({
      id: "p_no_case",
      name: "Dr. Solo",
      specialty: "GP",
      npi: "9999999999",
      status: "ACTIVE",
      orgId: "org_test",
      credentialingCase: null,
    });
    expect(await getCredentialingCaseDetail("p_no_case", "org_test")).toBeNull();
  });
});
