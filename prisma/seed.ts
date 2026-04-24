import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 12);

  const org = await prisma.organization.create({
    data: {
      name: "Acme Health System",
    },
  });

  await prisma.user.create({
    data: {
      email: "admin@assured.test",
      passwordHash,
      role: "ADMIN",
      orgId: org.id,
    },
  });

  await prisma.billingPlan.create({
    data: {
      orgId: org.id,
      platformFeeCents: 150_000,
      unitPriceCredentialing: 19_900,
      unitPriceLicense: 9_900,
      unitPriceEnrollment: 14_900,
      unitPriceMonitoring: 2_900,
    },
  });

  const provider1 = await prisma.provider.create({
    data: {
      npi: "1234567890",
      name: "Dr. Sarah Johnson",
      specialty: "Primary Care",
      status: "ACTIVE",
      orgId: org.id,
    },
  });

  const provider2 = await prisma.provider.create({
    data: {
      npi: "0987654321",
      name: "Dr. Michael Chen",
      specialty: "Cardiology",
      status: "ACTIVE",
      orgId: org.id,
    },
  });

  await prisma.license.createMany({
    data: [
      {
        providerId: provider1.id,
        state: "CA",
        number: "MD12345",
        expiresAt: new Date("2026-12-31"),
        status: "ACTIVE",
        workflowId: "lic_01",
      },
      {
        providerId: provider2.id,
        state: "NY",
        number: "MD67890",
        expiresAt: new Date("2025-06-30"),
        status: "ACTIVE",
        workflowId: "lic_02",
      },
    ],
  });

  await prisma.payerEnrollment.createMany({
    data: [
      {
        providerId: provider1.id,
        payer: "Blue Cross",
        state: "CA",
        status: "APPROVED",
        submittedAt: new Date("2026-01-15"),
        workflowId: "enr_01",
      },
      {
        providerId: provider2.id,
        payer: "Aetna",
        state: "NY",
        status: "PENDING",
        submittedAt: new Date("2026-03-01"),
        workflowId: "enr_02",
      },
    ],
  });

  await prisma.complianceCheck.createMany({
    data: [
      {
        providerId: provider1.id,
        source: "OIG",
        result: "CLEAN",
      },
      {
        providerId: provider2.id,
        source: "SAM",
        result: "CLEAN",
      },
      {
        providerId: provider2.id,
        source: "NPDB",
        result: "FLAG",
      },
    ],
  });

  await prisma.credentialingCase.createMany({
    data: [
      {
        providerId: provider1.id,
        workflowId: "cred_01",
        status: "COMPLETED",
      },
      {
        providerId: provider2.id,
        workflowId: "cred_02",
        status: "IN_PROGRESS",
      },
    ],
  });

  await prisma.usageEvent.createMany({
    data: [
      { orgId: org.id, type: "CREDENTIALING", providerId: provider1.id, unitCents: 19_900 },
      { orgId: org.id, type: "CREDENTIALING", providerId: provider2.id, unitCents: 19_900 },
      { orgId: org.id, type: "LICENSE", providerId: provider1.id, unitCents: 9_900 },
      { orgId: org.id, type: "LICENSE", providerId: provider2.id, unitCents: 9_900 },
      { orgId: org.id, type: "ENROLLMENT", providerId: provider1.id, unitCents: 14_900 },
      { orgId: org.id, type: "ENROLLMENT", providerId: provider2.id, unitCents: 14_900 },
      { orgId: org.id, type: "MONITORING", unitCents: 2_900 },
      { orgId: org.id, type: "MONITORING", unitCents: 2_900 },
    ],
  });

  await prisma.invoice.create({
    data: {
      orgId: org.id,
      periodStart: new Date("2026-03-01"),
      periodEnd: new Date("2026-03-31"),
      subtotalCents: 95_400,
      totalCents: 245_400,
      status: "PAID",
      lineItems: [],
    },
  });

  console.log("Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
