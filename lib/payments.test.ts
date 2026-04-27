import { describe, it, expect, mock, beforeEach } from "bun:test";

// Prisma method mocks
const paymentMethodFindFirst = mock(async (_args: unknown) => null as unknown);
const paymentMethodFindMany = mock(async (_args: unknown) => [] as unknown[]);
const paymentMethodUpdate = mock(
  async (args: { where: unknown; data: Record<string, unknown> }) => ({
    id: "pm_1",
    ...args.data,
  }),
);
const paymentMethodUpdateMany = mock(async (_args: unknown) => ({ count: 0 }));
const paymentMethodCreate = mock(async ({ data }: { data: Record<string, unknown> }) => ({
  id: "pm_new",
  ...data,
}));

mock.module("@/lib/db", () => ({
  prisma: {
    paymentMethod: {
      findFirst: paymentMethodFindFirst,
      findMany: paymentMethodFindMany,
      update: paymentMethodUpdate,
      updateMany: paymentMethodUpdateMany,
      create: paymentMethodCreate,
    },
  },
}));

// Stripe-mock module mocks
const stripeDeletePaymentMethod = mock((_id: string) => true);
const stripeListPaymentMethods = mock((_orgId: string) => [] as unknown[]);
const stripeSetDefaultPaymentMethod = mock((_id: string) => undefined);
const stripeCreatePaymentMethod = mock(() => ({}));

mock.module("@/lib/stripe-mock", () => ({
  createPaymentMethod: stripeCreatePaymentMethod,
  listPaymentMethods: stripeListPaymentMethods,
  setDefaultPaymentMethod: stripeSetDefaultPaymentMethod,
  deletePaymentMethod: stripeDeletePaymentMethod,
  createSubscription: mock(),
  getSubscription: mock(),
  cancelSubscription: mock(),
  updateSubscription: mock(),
}));

const { removePaymentMethod, listPaymentMethods, setDefaultPaymentMethod } = await import(
  "./payments"
);

describe("removePaymentMethod (soft-delete)", () => {
  beforeEach(() => {
    paymentMethodFindFirst.mockClear();
    paymentMethodUpdate.mockClear();
    stripeDeletePaymentMethod.mockClear();
  });

  it("queries with deletedAt: null filter", async () => {
    paymentMethodFindFirst.mockResolvedValueOnce(null as never);
    await removePaymentMethod("org_1", "pm_1", "user_1");
    expect(paymentMethodFindFirst).toHaveBeenCalledWith({
      where: { id: "pm_1", orgId: "org_1", deletedAt: null },
    });
  });

  it("returns false when method is not found (already soft-deleted)", async () => {
    paymentMethodFindFirst.mockResolvedValueOnce(null as never);
    const result = await removePaymentMethod("org_1", "pm_1", "user_1");
    expect(result).toBe(false);
    expect(paymentMethodUpdate).not.toHaveBeenCalled();
    expect(stripeDeletePaymentMethod).not.toHaveBeenCalled();
  });

  it("calls update with soft-delete fields and never calls delete", async () => {
    paymentMethodFindFirst.mockResolvedValueOnce({
      id: "pm_1",
      orgId: "org_1",
      stripePaymentMethodId: "pm_stripe_1",
      isDefault: false,
    } as never);

    const result = await removePaymentMethod("org_1", "pm_1", "user_1");
    expect(result).toBe(true);
    expect(paymentMethodUpdate).toHaveBeenCalledTimes(1);

    const call = paymentMethodUpdate.mock.calls[0][0] as {
      where: { id: string };
      data: { deletedAt: Date; deletedBy: string; isDefault: boolean };
    };
    expect(call.where).toEqual({ id: "pm_1" });
    expect(call.data.deletedBy).toBe("user_1");
    expect(call.data.deletedAt).toBeInstanceOf(Date);
    expect(call.data.isDefault).toBe(false);
  });

  it("detaches from Stripe mock on remove", async () => {
    paymentMethodFindFirst.mockResolvedValueOnce({
      id: "pm_1",
      orgId: "org_1",
      stripePaymentMethodId: "pm_stripe_1",
      isDefault: false,
    } as never);

    await removePaymentMethod("org_1", "pm_1", "user_1");
    expect(stripeDeletePaymentMethod).toHaveBeenCalledWith("pm_stripe_1");
  });
});

describe("listPaymentMethods (soft-delete filter)", () => {
  beforeEach(() => {
    paymentMethodFindMany.mockClear();
    stripeListPaymentMethods.mockClear();
  });

  it("filters out soft-deleted records via deletedAt: null", async () => {
    paymentMethodFindMany.mockResolvedValueOnce([] as never);
    stripeListPaymentMethods.mockReturnValueOnce([] as never);

    await listPaymentMethods("org_1");
    expect(paymentMethodFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { orgId: "org_1", deletedAt: null },
      }),
    );
  });
});

describe("setDefaultPaymentMethod (soft-delete filter)", () => {
  beforeEach(() => {
    paymentMethodFindFirst.mockClear();
    paymentMethodUpdate.mockClear();
    paymentMethodUpdateMany.mockClear();
    stripeSetDefaultPaymentMethod.mockClear();
  });

  it("returns false for soft-deleted method", async () => {
    paymentMethodFindFirst.mockResolvedValueOnce(null as never);
    const result = await setDefaultPaymentMethod("org_1", "pm_1");
    expect(result).toBe(false);
    expect(paymentMethodFindFirst).toHaveBeenCalledWith({
      where: { id: "pm_1", orgId: "org_1", deletedAt: null },
    });
  });

  it("scopes updateMany clearing of defaults to non-deleted methods", async () => {
    paymentMethodFindFirst.mockResolvedValueOnce({
      id: "pm_1",
      orgId: "org_1",
      stripePaymentMethodId: "pm_stripe_1",
    } as never);

    await setDefaultPaymentMethod("org_1", "pm_1");
    expect(paymentMethodUpdateMany).toHaveBeenCalledWith({
      where: { orgId: "org_1", deletedAt: null },
      data: { isDefault: false },
    });
  });
});
