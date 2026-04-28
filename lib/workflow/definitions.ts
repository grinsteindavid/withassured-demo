import type { WorkflowType } from "./types";

// Static workflow definitions — known from the workflow code itself.
export const WORKFLOW_DEFINITIONS: Record<WorkflowType, string[]> = {
  credentialing: [
    "APPLICATION_RECEIVED",
    "PSV_EDUCATION",
    "PSV_DEA",
    "SANCTIONS_CHECK",
    "COMMITTEE_REVIEW",
    "APPROVED",
  ],
  license: ["APPLICATION_PREP", "SUBMITTED", "STATE_REVIEW", "ISSUED"],
  enrollment: ["SUBMITTED", "PAYER_ACK", "FOLLOW_UP", "APPROVED"],
  compliance: ["CHECK_OIG", "CHECK_SAM", "CHECK_NPDB", "COMPLETED"],
};

const PREFIX_TO_TYPE: Record<string, WorkflowType> = {
  cred_: "credentialing",
  lic_: "license",
  enr_: "enrollment",
  comp_: "compliance",
};

export function inferType(workflowId: string): WorkflowType {
  for (const [prefix, type] of Object.entries(PREFIX_TO_TYPE)) {
    if (workflowId.startsWith(prefix)) return type;
  }
  throw new Error(`Unknown workflow type for id: ${workflowId}`);
}
