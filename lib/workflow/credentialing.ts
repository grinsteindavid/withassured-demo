import { WORKFLOW_DEFINITIONS } from "./definitions";
import { ensureRunStep, completeRunStep, failRunStep, runStep } from "./steps";

export async function credentialingWorkflow(workflowId: string) {
  "use workflow";

  await ensureRunStep(workflowId, "credentialing");

  try {
    for (const name of WORKFLOW_DEFINITIONS.credentialing) {
      await runStep(workflowId, name);
    }
    await completeRunStep(workflowId);
  } catch (err) {
    await failRunStep(workflowId);
    throw err;
  }
}
