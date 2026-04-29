import { WORKFLOW_DEFINITIONS } from "./definitions";
import { ensureRunStep, completeRunStep, failRunStep, runStep } from "./steps";

export async function licenseWorkflow(workflowId: string) {
  "use workflow";

  await ensureRunStep(workflowId, "license");

  try {
    for (const name of WORKFLOW_DEFINITIONS.license) {
      await runStep(workflowId, name);
    }
    await completeRunStep(workflowId);
  } catch (err) {
    await failRunStep(workflowId);
    throw err;
  }
}
