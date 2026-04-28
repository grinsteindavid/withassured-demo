# CI Setup

## GitHub Actions

### E2E Tests on Vercel Preview

The workflow `.github/workflows/e2e-tests.yml` runs Playwright E2E tests against the Vercel preview deployment on every pull request.

### Required Secrets

Configure the following secrets in **Settings > Secrets and variables > Actions**:

| Secret | Description |
|--------|-------------|
| `VERCEL_TOKEN` | Vercel authentication token. Create at [vercel.com/account/tokens](https://vercel.com/account/tokens). |
| `VERCEL_ORG_ID` | Your Vercel organization ID. Found in `.vercel/project.json` or team settings. |
| `VERCEL_PROJECT_ID` | Your Vercel project ID. Found in `.vercel/project.json`. |
| `E2E_USER_EMAIL` | Email of a seeded user for Playwright login (e.g., `admin@assured.test`). |
| `E2E_USER_PASSWORD` | Password for the seeded Playwright test user. |

### How It Works

1. A pull request triggers the workflow.
2. The workflow waits for the Vercel preview deployment to finish.
3. It installs dependencies and Playwright browsers.
4. It runs E2E tests against the preview URL.
5. On failure, the Playwright report is uploaded as an artifact.

### Local E2E Testing

```bash
bun test:e2e
```

This starts the dev server locally and runs tests against `http://localhost:3000`.
