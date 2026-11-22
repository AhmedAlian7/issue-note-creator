import { defineConfig, devices } from "@playwright/test";

const port = 3100;
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  use: { ...devices["Pixel 7"], baseURL },
  webServer: {
    env: { AI_PROVIDER: "fake" },
    command: `pnpm dev --hostname 127.0.0.1 --port ${port}`,
    url: baseURL,
    timeout: 120_000,
    reuseExistingServer: false,
  },
});
