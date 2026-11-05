import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: "http://127.0.0.1:3411",
    headless: true,
    trace: "retain-on-failure",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : {},
  },
  webServer: [
    {
      command: "node tests/fixtures/backend.mjs",
      url: "http://127.0.0.1:3511/health",
      reuseExistingServer: false,
      timeout: 10_000,
    },
    {
      env: { API_URL: "http://127.0.0.1:3511" },
      command: "npm run start -- --hostname 127.0.0.1 --port 3411",
      url: "http://127.0.0.1:3411/login",
      reuseExistingServer: false,
      timeout: 30_000,
    },
  ],
});
