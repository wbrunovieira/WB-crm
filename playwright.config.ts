import { defineConfig, devices } from "@playwright/test";

// E2E do frontend (Next.js) rodando LOCAL. O Playwright sobe o `next dev` do CRM
// numa porta dedicada (3100) — não reaproveita a 3000 (que pode ter outro app).
// Usa o Chrome do sistema (channel via device "Desktop Chrome"), sem baixar o chromium.
const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    // Local: usa o Google Chrome do sistema (channel: "chrome") — não baixa o chromium.
    // No CI (Linux): usa o chromium do Playwright (instalado no workflow), sem channel.
    {
      name: "chromium",
      use: process.env.CI
        ? { ...devices["Desktop Chrome"] }
        : { ...devices["Desktop Chrome"], channel: "chrome" },
    },
  ],
  webServer: {
    command: `npm run dev -- -p ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
