export type WorkflowStep = {
  name: string;
  status: "COMPLETED" | "RUNNING" | "PENDING" | "FAILED";
  at?: string;
};

export type Workflow = {
  workflowId: string;
  type: "credentialing" | "license" | "enrollment";
  status: "RUNNING" | "COMPLETED" | "FAILED";
  currentStep: string;
  steps: WorkflowStep[];
};

const credentialingSteps: WorkflowStep[] = [
  { name: "APPLICATION_RECEIVED", status: "COMPLETED", at: "2026-04-20T09:00:00Z" },
  { name: "PSV_EDUCATION", status: "COMPLETED", at: "2026-04-20T14:12:00Z" },
  { name: "PSV_DEA", status: "COMPLETED", at: "2026-04-21T10:44:00Z" },
  { name: "SANCTIONS_CHECK", status: "RUNNING" },
  { name: "COMMITTEE_REVIEW", status: "PENDING" },
  { name: "APPROVED", status: "PENDING" },
];

const licenseSteps: WorkflowStep[] = [
  { name: "APPLICATION_PREP", status: "COMPLETED", at: "2026-04-22T08:00:00Z" },
  { name: "SUBMITTED", status: "COMPLETED", at: "2026-04-22T09:30:00Z" },
  { name: "STATE_REVIEW", status: "RUNNING" },
  { name: "ISSUED", status: "PENDING" },
];

const enrollmentSteps: WorkflowStep[] = [
  { name: "SUBMITTED", status: "COMPLETED", at: "2026-04-23T10:00:00Z" },
  { name: "PAYER_ACK", status: "COMPLETED", at: "2026-04-23T14:00:00Z" },
  { name: "FOLLOW_UP", status: "RUNNING" },
  { name: "APPROVED", status: "PENDING" },
];

export function getWorkflow(workflowId: string): Workflow {
  if (workflowId.startsWith("cred_")) {
    return {
      workflowId,
      type: "credentialing",
      status: "RUNNING",
      currentStep: "SANCTIONS_CHECK",
      steps: credentialingSteps,
    };
  }
  if (workflowId.startsWith("lic_")) {
    return {
      workflowId,
      type: "license",
      status: "RUNNING",
      currentStep: "STATE_REVIEW",
      steps: licenseSteps,
    };
  }
  if (workflowId.startsWith("enr_")) {
    return {
      workflowId,
      type: "enrollment",
      status: "RUNNING",
      currentStep: "FOLLOW_UP",
      steps: enrollmentSteps,
    };
  }
  throw new Error("Unknown workflow type");
}
