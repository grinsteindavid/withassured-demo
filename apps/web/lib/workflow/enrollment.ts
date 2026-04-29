import { WORKFLOW_DEFINITIONS } from "./definitions";
import { ensureRunStep, completeRunStep, failRunStep, runStep } from "./steps";

export async function enrollmentWorkflow(workflowId: string) {
  "use workflow";

  await ensureRunStep(workflowId, "enrollment");

  try {
    for (const name of WORKFLOW_DEFINITIONS.enrollment) {
      await runStep(workflowId, name);
    }
    await completeRunStep(workflowId);
  } catch (err) {
    await failRunStep(workflowId);
    throw err;
  }
}
