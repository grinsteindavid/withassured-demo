import { prisma } from "@/lib/db";
import { mockTemporal } from "@/lib/temporal/client";
import { currentStep, fullStepList } from "@/lib/temporal/derive";
import type { WorkflowStep } from "@/lib/temporal/types";

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

export async function listCredentialingCases(): Promise<CredentialingCaseSummary[]> {
  const providers = await prisma.provider.findMany({
    where: { credentialingCase: { isNot: null } },
    include: { credentialingCase: true },
    orderBy: { name: "asc" },
  });

  return Promise.all(
    providers.map(async (p) => {
      const workflowId = p.credentialingCase!.workflowId;
      const handle = mockTemporal.workflow.getHandle(workflowId);
      const [info, history] = await Promise.all([handle.describe(), handle.fetchHistory()]);
      return {
        providerId: p.id,
        providerName: p.name,
        specialty: p.specialty,
        npi: p.npi,
        workflowId,
        status: info.status.name,
        currentStep: currentStep(history.events),
        startTime: info.startTime,
      };
    }),
  );
}

export async function getCredentialingCaseDetail(
  providerId: string,
): Promise<CredentialingCaseDetail | null> {
  const provider = await prisma.provider.findUnique({
    where: { id: providerId },
    include: { credentialingCase: true },
  });
  if (!provider || !provider.credentialingCase) return null;

  const workflowId = provider.credentialingCase.workflowId;
  const handle = mockTemporal.workflow.getHandle(workflowId);
  const [info, history] = await Promise.all([handle.describe(), handle.fetchHistory()]);

  return {
    providerId: provider.id,
    providerName: provider.name,
    specialty: provider.specialty,
    npi: provider.npi,
    workflowId,
    status: info.status.name,
    currentStep: currentStep(history.events),
    startTime: info.startTime,
    steps: fullStepList(history.events, info.type),
  };
}
