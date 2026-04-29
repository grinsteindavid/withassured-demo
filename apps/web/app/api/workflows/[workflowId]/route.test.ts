import { describe, it, expect, mock, beforeEach } from "bun:test";

const getSessionUserMock = mock(async () => ({
  userId: "user_1",
  orgId: "org_1",
  role: "ADMIN",
}) as { userId: string; orgId: string; role: string } | null);

const credentialingCaseFindUnique = mock(async () => null as unknown);
const licenseFindFirst = mock(async () => null as unknown);
const payerEnrollmentFindFirst = mock(async () => null as unknown);
const complianceCheckFindUnique = mock(async () => null as unknown);

const getWorkflowStateMock = mock(async () => ({
  workflowId: "stub",
  runId: "run_stub",
  type: "credentialing",
  status: "RUNNING",
  currentStep: "PSV_DEA",
  steps: [{ name: "APPLICATION_RECEIVED", status: "COMPLETED" }],
  startTime: new Date("2026-04-27T00:00:00Z"),
  closeTime: undefined,
}));

mock.module("@/lib/auth", () => ({
  getSessionUser: getSessionUserMock,
}));

mock.module("@/lib/db", () => ({
  prisma: {
    credentialingCase: { findUnique: credentialingCaseFindUnique },
    license: { findFirst: licenseFindFirst },
    payerEnrollment: { findFirst: payerEnrollmentFindFirst },
    complianceCheck: { findUnique: complianceCheckFindUnique },
  },
}));

mock.module("@/lib/workflow/read", () => ({
  getWorkflowState: getWorkflowStateMock,
}));

const { GET } = await import("./route");

function makeReq(): Request {
  return new Request("http://localhost:3000/api/workflows/cred_p_1");
}

function makeParams(workflowId: string) {
  return { params: Promise.resolve({ workflowId }) };
}

beforeEach(() => {
  getSessionUserMock.mockClear();
  credentialingCaseFindUnique.mockClear();
  licenseFindFirst.mockClear();
  payerEnrollmentFindFirst.mockClear();
  complianceCheckFindUnique.mockClear();
  getWorkflowStateMock.mockClear();
  // Default: an authenticated session.
  getSessionUserMock.mockResolvedValue({ userId: "user_1", orgId: "org_1", role: "ADMIN" });
});

describe("GET /api/workflows/[workflowId]", () => {
  it("returns 401 when no session", async () => {
    getSessionUserMock.mockResolvedValueOnce(null);
    const res = await GET(makeReq(), makeParams("cred_p_1"));
    expect(res.status).toBe(401);
  });

  it("returns 404 when the workflow ID prefix is unknown", async () => {
    const res = await GET(makeReq(), makeParams("zzz_unknown"));
    expect(res.status).toBe(404);
    expect(getWorkflowStateMock).not.toHaveBeenCalled();
  });

  it("returns 404 when the parent entity does not exist", async () => {
    credentialingCaseFindUnique.mockResolvedValueOnce(null);
    const res = await GET(makeReq(), makeParams("cred_missing"));
    expect(res.status).toBe(404);
    expect(getWorkflowStateMock).not.toHaveBeenCalled();
  });

  it("returns 404 when the parent entity belongs to a different org", async () => {
    credentialingCaseFindUnique.mockResolvedValueOnce({
      workflowId: "cred_p_2",
      provider: { orgId: "org_other" },
    });
    const res = await GET(makeReq(), makeParams("cred_p_2"));
    expect(res.status).toBe(404);
    expect(getWorkflowStateMock).not.toHaveBeenCalled();
  });

  it("returns 200 with workflow state for an authorized credentialing workflow", async () => {
    credentialingCaseFindUnique.mockResolvedValueOnce({
      workflowId: "cred_p_1",
      provider: { orgId: "org_1" },
    });
    const res = await GET(makeReq(), makeParams("cred_p_1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.steps).toEqual([{ name: "APPLICATION_RECEIVED", status: "COMPLETED" }]);
    expect(getWorkflowStateMock).toHaveBeenCalledWith("cred_p_1");
  });

  it("authorizes license workflows by License.workflowId", async () => {
    licenseFindFirst.mockResolvedValueOnce({
      workflowId: "lic_l_1",
      provider: { orgId: "org_1" },
    });
    const res = await GET(makeReq(), makeParams("lic_l_1"));
    expect(res.status).toBe(200);
    expect(licenseFindFirst).toHaveBeenCalledWith({
      where: { workflowId: "lic_l_1" },
      include: { provider: true },
    });
  });

  it("authorizes enrollment workflows by PayerEnrollment.workflowId", async () => {
    payerEnrollmentFindFirst.mockResolvedValueOnce({
      workflowId: "enr_e_1",
      provider: { orgId: "org_1" },
    });
    const res = await GET(makeReq(), makeParams("enr_e_1"));
    expect(res.status).toBe(200);
    expect(payerEnrollmentFindFirst).toHaveBeenCalledWith({
      where: { workflowId: "enr_e_1" },
      include: { provider: true },
    });
  });

  it("authorizes compliance workflows by stripping the comp_ prefix to look up the check", async () => {
    complianceCheckFindUnique.mockResolvedValueOnce({
      id: "c_1",
      provider: { orgId: "org_1" },
    });
    const res = await GET(makeReq(), makeParams("comp_c_1"));
    expect(res.status).toBe(200);
    expect(complianceCheckFindUnique).toHaveBeenCalledWith({
      where: { id: "c_1" },
      include: { provider: true },
    });
  });

  it("returns 404 when getWorkflowState throws (workflow row missing)", async () => {
    credentialingCaseFindUnique.mockResolvedValueOnce({
      workflowId: "cred_p_1",
      provider: { orgId: "org_1" },
    });
    getWorkflowStateMock.mockRejectedValueOnce(new Error("Workflow not found: cred_p_1"));
    const res = await GET(makeReq(), makeParams("cred_p_1"));
    expect(res.status).toBe(404);
  });
});
