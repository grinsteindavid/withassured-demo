import { expect, type Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

export class DashboardPage extends BasePage {
  readonly heading: Locator = this.page.getByTestId("dashboard-heading");
  readonly logoutButton: Locator = this.page.getByTestId("logout-button");

  async goto() {
    await super.goto("/dashboard");
    await this.expectLoaded();
  }

  async expectLoaded() {
    await expect(this.heading).toBeVisible();
  }

  async navigateTo(name: "Billing" | "Roster" | "Credentialing" | "Licensing" | "Enrollment" | "Compliance" | "Overview") {
    await this.page.getByRole("link", { name }).click();
  }

  async logout() {
    await this.logoutButton.click();
  }
}
