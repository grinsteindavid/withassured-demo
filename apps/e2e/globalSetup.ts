import { request, type FullConfig } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const STORAGE_PATH = "playwright/.auth/admin.json";

async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0].use.baseURL;
  console.log("baseURL", baseURL);
  const email = process.env.E2E_USER_EMAIL;
  const password = process.env.E2E_USER_PASSWORD;

  if (!email || !password) {
    throw new Error("E2E_USER_EMAIL and E2E_USER_PASSWORD must be set (see .env.example).");
  }

  const ctx = await request.newContext({ baseURL });
  const res = await ctx.post("/api/auth/login", {
    data: { email, password },
  });

  if (!res.ok()) {
    throw new Error(`globalSetup login failed: ${res.status()} ${await res.text()}`);
  }

  await mkdir("playwright/.auth", { recursive: true });
  await ctx.storageState({ path: STORAGE_PATH });
  await ctx.dispose();
}

export default globalSetup;
