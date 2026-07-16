import { defineConfig, devices } from "@playwright/test";

// E2E do frontend (Next.js) rodando LOCAL. O Playwright sobe o `next dev` do CRM
// numa porta dedicada (3100) — não reaproveita a 3000 (que pode ter outro app).
// Usa o Chrome do sistema (channel via device "Desktop Chrome"), sem baixar o chromium.
const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  // Serial: the partner mock-backend specs each bind the fixed backend port (3010),
  // so they must not run concurrently.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    // The booking page auto-detects language from navigator.language; pin the browser
    // locale so specs render in pt-BR (the assertions are in Portuguese).
    locale: "pt-BR",
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
    // NextAuth callbacks/redirects must target the e2e port, not the .env default.
    env: { NEXTAUTH_URL: baseURL },
  },
});
