import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { prisma } from "@/lib/db";
import { removePaymentMethod, listPaymentMethods, setDefaultPaymentMethod } from "@/lib/payments";

const orgId = "org_integration_test_payments";
const userId = "user_integration_test_payments";

async function cleanup() {
  await prisma.paymentMethod.deleteMany({ where: { orgId } });
}

describe("payments soft-delete (integration)", () => {
  let methodId: string;

  beforeEach(async () => {
    await cleanup();
    const method = await prisma.paymentMethod.create({
      data: {
        orgId,
        type: "CARD",
        isDefault: false,
        stripePaymentMethodId: `pm_stripe_int_${Date.now()}`,
      },
    });
    methodId = method.id;
  });

  afterAll(async () => {
    await cleanup();
  });

  it("removePaymentMethod sets deletedAt and deletedBy instead of hard-deleting", async () => {
    const success = await removePaymentMethod(orgId, methodId, userId);
    expect(success).toBe(true);

    const dbMethod = await prisma.paymentMethod.findUnique({ where: { id: methodId } });
    expect(dbMethod).not.toBeNull();
    expect(dbMethod!.deletedAt).not.toBeNull();
    expect(dbMethod!.deletedBy).toBe(userId);
    expect(dbMethod!.isDefault).toBe(false);
  });

  it("removePaymentMethod returns false for already soft-deleted method", async () => {
    await removePaymentMethod(orgId, methodId, userId);
    const success = await removePaymentMethod(orgId, methodId, userId);
    expect(success).toBe(false);
  });

  it("listPaymentMethods excludes soft-deleted methods", async () => {
    await prisma.paymentMethod.create({
      data: {
        orgId,
        type: "ACH",
        isDefault: false,
        stripePaymentMethodId: `pm_stripe_int_2_${Date.now()}`,
      },
    });

    await removePaymentMethod(orgId, methodId, userId);

    const methods = await listPaymentMethods(orgId);
    expect(methods.length).toBe(1);
  });

  it("setDefaultPaymentMethod returns false for soft-deleted method", async () => {
    await removePaymentMethod(orgId, methodId, userId);

    const success = await setDefaultPaymentMethod(orgId, methodId);
    expect(success).toBe(false);
  });

  it("setDefaultPaymentMethod does not flip isDefault on soft-deleted methods when clearing defaults", async () => {
    const method2 = await prisma.paymentMethod.create({
      data: {
        orgId,
        type: "ACH",
        isDefault: true,
        stripePaymentMethodId: `pm_stripe_int_3_${Date.now()}`,
      },
    });

    await removePaymentMethod(orgId, methodId, userId);

    const success = await setDefaultPaymentMethod(orgId, method2.id);
    expect(success).toBe(true);

    const deletedMethod = await prisma.paymentMethod.findUnique({ where: { id: methodId } });
    expect(deletedMethod!.isDefault).toBe(false);

    const activeMethod = await prisma.paymentMethod.findUnique({ where: { id: method2.id } });
    expect(activeMethod!.isDefault).toBe(true);
  });
});
