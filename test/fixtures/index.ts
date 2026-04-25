export const makeProvider = (overrides = {}) => ({
  id: "p_1",
  npi: "1234567890",
  name: "Dr. Test Provider",
  specialty: "Primary Care",
  status: "ACTIVE",
  orgId: "org_1",
  ...overrides,
});

export const makeWorkflow = (overrides = {}) => ({
  workflowId: "cred_01H123",
  type: "credentialing",
  status: "RUNNING",
  currentStep: "SANCTIONS_CHECK",
  steps: [
    { name: "APPLICATION_RECEIVED", status: "COMPLETED", at: "2026-04-20T09:00:00Z" },
    { name: "PSV_EDUCATION", status: "COMPLETED", at: "2026-04-20T14:12:00Z" },
    { name: "PSV_DEA", status: "COMPLETED", at: "2026-04-21T10:44:00Z" },
    { name: "SANCTIONS_CHECK", status: "RUNNING" },
    { name: "COMMITTEE_REVIEW", status: "PENDING" },
    { name: "APPROVED", status: "PENDING" },
  ],
  ...overrides,
});

export const makeInvoice = (overrides = {}) => ({
  id: "inv_1",
  orgId: "org_1",
  periodStart: "2026-04-01T00:00:00Z",
  periodEnd: "2026-04-30T23:59:59Z",
  subtotalCents: 663300,
  totalCents: 813300,
  status: "OPEN",
  lineItems: [],
  ...overrides,
});
