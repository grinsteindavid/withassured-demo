// Provider data types and the pure status-derivation function.
//
// Imports only Prisma type aliases (erased at compile time), so this module
// is safe to import from client components.

import type {
  ProviderStatus,
  License,
  PayerEnrollment,
  ComplianceCheck,
} from "@prisma/client";

export type ProviderWithRelations = {
  id: string;
  npi: string;
  name: string;
  specialty: string;
  status: ProviderStatus;
  orgId: string;
  createdAt: Date;
  updatedAt: Date;
  licenses: License[];
  enrollments: PayerEnrollment[];
  complianceChecks: ComplianceCheck[];
};

export type ProviderSummary = {
  id: string;
  npi: string;
  name: string;
  specialty: string;
  status: ProviderStatus;
  licenseCount: number;
  enrollmentCount: number;
  hasComplianceFlag: boolean;
  createdAt: Date;
};

export type ProviderDetail = ProviderSummary & {
  licenses: License[];
  enrollments: PayerEnrollment[];
  complianceChecks: ComplianceCheck[];
};

export function computeProviderStatus(
  provider: Pick<
    ProviderWithRelations,
    "licenses" | "complianceChecks"
  >,
): ProviderStatus {
  const hasExpiredOrRevokedLicense = provider.licenses.some(
    (l) => l.status === "EXPIRED" || l.status === "REVOKED",
  );
  const hasComplianceFlag = provider.complianceChecks.some(
    (c) => c.result === "FLAG",
  );

  if (hasExpiredOrRevokedLicense || hasComplianceFlag) {
    return "INACTIVE";
  }

  const hasPendingLicense = provider.licenses.some(
    (l) => l.status === "PENDING",
  );

  if (hasPendingLicense) {
    return "PENDING";
  }

  return "ACTIVE";
}
