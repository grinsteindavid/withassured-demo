import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const ORG_ID = "org_acme_health";
const ADMIN_EMAIL = "admin@assured.test";

async function main() {
  // Idempotency gate — if the admin user already exists, exit clean.
  // Re-running the seed becomes a no-op so it's safe to wire into container startup.
  const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (existing) {
    console.log(`Seed already applied (${ADMIN_EMAIL} exists). Skipping.`);
    return;
  }

  const passwordHash = await bcrypt.hash("password123", 12);

  await prisma.organization.create({
    data: {
      id: ORG_ID,
      name: "Acme Health System",
      users: {
        create: {
          email: ADMIN_EMAIL,
          passwordHash,
          role: "ADMIN",
        },
      },
      plan: {
        create: {
          platformFeeCents: 150_000,
          unitPriceCredentialing: 19_900,
          unitPriceLicense: 9_900,
          unitPriceEnrollment: 14_900,
          unitPriceMonitoring: 2_900,
        },
      },
    },
  });

  await prisma.invoice.create({
    data: {
      orgId: ORG_ID,
      periodStart: new Date("2026-03-01"),
      periodEnd: new Date("2026-03-31"),
      subtotalCents: 95_400,
      totalCents: 245_400,
      status: "PAID",
      lineItems: [],
    },
  });

  console.log("Seed completed successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
