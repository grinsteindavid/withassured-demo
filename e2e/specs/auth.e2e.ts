import { test, expect } from "../fixtures";

test.describe("auth (unauthenticated)", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("redirects /dashboard to /login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("shows error on invalid credentials", async ({ loginPage }) => {
    await loginPage.goto();
    await loginPage.signIn("admin@assured.test", "wrong-password");
    await loginPage.expectError();
  });

  test("logs in and lands on /dashboard", async ({ page, loginPage, dashboardPage }) => {
    await loginPage.goto();
    await loginPage.signIn(
      process.env.E2E_USER_EMAIL!,
      process.env.E2E_USER_PASSWORD!,
    );
    await page.waitForURL(/\/dashboard$/);
    await dashboardPage.expectLoaded();
  });
});

test.describe("auth (authenticated via storage state)", () => {
  test("dashboard renders for authed user", async ({ dashboardPage }) => {
    await dashboardPage.goto();
    await dashboardPage.expectLoaded();
  });

  test("logout clears session and redirects to login", async ({ page, dashboardPage }) => {
    await dashboardPage.goto();
    await dashboardPage.logout();
    await page.waitForURL(/\/login$/);

    const sessionCookie = (await page.context().cookies()).find((c) => c.name === "session");
    expect(sessionCookie).toBeUndefined();

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login$/);
  });
});
