import { defineConfig, devices } from "@playwright/test";

const port = 3100;
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  use: {
    ...devices[process.env.E2E_DESKTOP === "1" ? "Desktop Chrome" : "Pixel 7"],
    baseURL,
  },
  webServer: {
    env: {
      AI_PROVIDER: "fake",
      SMTP_HOST: "127.0.0.1",
      SMTP_PORT: "1025",
      SMTP_USER: "",
      SMTP_PASS: "",
      MAIL_FROM: "warehouse@example.test",
      SESSION_SECRET: "isolated-playwright-signing-secret",
      APP_BASE_URL: baseURL,
    },
    command: `pnpm dev --hostname 127.0.0.1 --port ${port}`,
    url: baseURL,
    timeout: 120_000,
    reuseExistingServer: false,
  },
});
