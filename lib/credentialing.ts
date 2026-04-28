import "server-only";

import { prisma } from "@/lib/db";
import { getWorkflowState } from "@/lib/workflow/read";
import type { WorkflowStep } from "@/lib/workflow/types";

export type CredentialingCaseSummary = {
  providerId: string;
  providerName: string;
  specialty: string;
  npi: string;
  workflowId: string;
  status: string;
  currentStep: string | null;
  startTime: Date;
};

export type CredentialingCaseDetail = CredentialingCaseSummary & {
  steps: WorkflowStep[];
};

export async function listCredentialingCases(orgId: string): Promise<CredentialingCaseSummary[]> {
  const providers = await prisma.provider.findMany({
    where: {
      credentialingCase: { isNot: null },
      orgId,
    },
    include: { credentialingCase: true },
    orderBy: { name: "asc" },
  });

  return Promise.all(
    providers.map(async (p) => {
      const workflowId = p.credentialingCase!.workflowId;
      const state = await getWorkflowState(workflowId);
      return {
        providerId: p.id,
        providerName: p.name,
        specialty: p.specialty,
        npi: p.npi,
        workflowId,
        status: state.status,
        currentStep: state.currentStep,
        startTime: state.startTime,
      };
    }),
  );
}

export async function getCredentialingCaseDetail(
  providerId: string,
  orgId: string,
): Promise<CredentialingCaseDetail | null> {
  const provider = await prisma.provider.findUnique({
    where: { id: providerId },
    include: { credentialingCase: true },
  });
  if (!provider || !provider.credentialingCase) return null;
  if (provider.orgId !== orgId) return null;

  const workflowId = provider.credentialingCase.workflowId;
  const state = await getWorkflowState(workflowId);

  return {
    providerId: provider.id,
    providerName: provider.name,
    specialty: provider.specialty,
    npi: provider.npi,
    workflowId,
    status: state.status,
    currentStep: state.currentStep,
    startTime: state.startTime,
    steps: state.steps,
  };
}
