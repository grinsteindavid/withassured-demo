import { describe, it, expect, mock, beforeEach } from "bun:test";

const alertFindMany = mock(async () => []);
const alertUpdate = mock(async () => ({}));
const alertUpdateMany = mock(async () => ({ count: 0 }));
const alertCount = mock(async () => 0);

mock.module("@/lib/db", () => ({
  prisma: {
    alert: {
      findMany: alertFindMany,
      update: alertUpdate,
      updateMany: alertUpdateMany,
      count: alertCount,
    },
  },
}));

const { getAlerts, markAlertAsRead, markAllAlertsAsRead, getUnreadCount } = await import("./alerts");

beforeEach(() => {
  alertFindMany.mockClear();
  alertUpdate.mockClear();
  alertUpdateMany.mockClear();
  alertCount.mockClear();
});

describe("getAlerts", () => {
  it("fetches alerts with default options", async () => {
    alertFindMany.mockResolvedValueOnce([]);

    await getAlerts("org_1");

    expect(alertFindMany).toHaveBeenCalledWith({
      where: { orgId: "org_1" },
      orderBy: { createdAt: "desc" },
      take: 50,
      skip: 0,
    });
  });

  it("fetches alerts with severity filter", async () => {
    alertFindMany.mockResolvedValueOnce([]);

    await getAlerts("org_1", { severity: "ERROR" });

    expect(alertFindMany).toHaveBeenCalledWith({
      where: { orgId: "org_1", severity: "ERROR" },
      orderBy: { createdAt: "desc" },
      take: 50,
      skip: 0,
    });
  });

  it("fetches alerts with custom limit and offset", async () => {
    alertFindMany.mockResolvedValueOnce([]);

    await getAlerts("org_1", { limit: 100, offset: 50 });

    expect(alertFindMany).toHaveBeenCalledWith({
      where: { orgId: "org_1" },
      orderBy: { createdAt: "desc" },
      take: 100,
      skip: 50,
    });
  });
});

describe("markAlertAsRead", () => {
  it("marks a single alert as read", async () => {
    alertUpdate.mockResolvedValueOnce({});

    await markAlertAsRead("alert_1");

    expect(alertUpdate).toHaveBeenCalledWith({
      where: { id: "alert_1" },
      data: { read: true },
    });
  });
});

describe("markAllAlertsAsRead", () => {
  it("marks all alerts as read for an organization", async () => {
    alertUpdateMany.mockResolvedValueOnce({ count: 5 });

    await markAllAlertsAsRead("org_1");

    expect(alertUpdateMany).toHaveBeenCalledWith({
      where: { orgId: "org_1", read: false },
      data: { read: true },
    });
  });
});

describe("getUnreadCount", () => {
  it("returns count of unread alerts", async () => {
    alertCount.mockResolvedValueOnce(3);

    const count = await getUnreadCount("org_1");

    expect(count).toBe(3);
    expect(alertCount).toHaveBeenCalledWith({
      where: { orgId: "org_1", read: false },
    });
  });
});
