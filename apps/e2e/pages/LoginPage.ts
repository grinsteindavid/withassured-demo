import { expect, type Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

export class LoginPage extends BasePage {
  readonly heading: Locator = this.page.getByRole("heading", { name: "Login" });
  readonly emailInput: Locator = this.page.getByTestId("login-email");
  readonly passwordInput: Locator = this.page.getByTestId("login-password");
  readonly submitButton: Locator = this.page.getByTestId("login-submit");
  readonly errorMessage: Locator = this.page.getByText("Invalid credentials");

  async goto() {
    await super.goto("/login");
    await expect(this.heading).toBeVisible();
  }

  async signIn(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async expectError() {
    await expect(this.errorMessage).toBeVisible();
  }
}
