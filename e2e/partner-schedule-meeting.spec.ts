import { test, expect } from "@playwright/test";
import {
  startMeetingMockBackend,
  PARTNER_ID,
  PARTNER_NAME,
  CLIENT_EMAIL,
  USER_EMAIL,
  type MeetingMock,
} from "./support/partner-meeting-mock-backend";

test.use({ timezoneId: "America/Sao_Paulo" });

let mock: MeetingMock;
test.beforeAll(async () => {
  mock = await startMeetingMockBackend(3010);
});
test.afterAll(async () => {
  await mock?.close();
});

test.describe("Agendar reunião na página do partner (E2E UI)", () => {
  test("login → partner → agenda reunião com o cliente; o pedido carrega o cliente + partner", async ({ page }) => {
    // Login (NextAuth credentials → mock /auth/login).
    await page.goto("/login");
    await page.getByPlaceholder("seu@email.com").fill(USER_EMAIL);
    await page.getByPlaceholder("••••••••").fill("qualquer-senha");
    await page.getByRole("button", { name: "Entrar" }).click();
    await page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 20_000 });

    // Partner page with the "Reuniões" section.
    await page.goto(`/partners/${PARTNER_ID}`);
    await expect(page.getByRole("heading", { name: PARTNER_NAME })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Reuniões/ })).toBeVisible();

    // Open the schedule modal (empty state — no meetings yet).
    await page.getByRole("button", { name: /Agendar Primeira Reunião/ }).click();
    await expect(page.getByPlaceholder(/Apresentação da proposta/)).toBeVisible();

    // Fill title + date + time.
    await page.getByPlaceholder(/Apresentação da proposta/).fill("Call com o cliente (E2E)");
    await page.locator('input[type="date"]').first().fill("2026-07-20");
    await page.locator('input[type="time"]').first().fill("14:00");

    // Add the client as attendee via its suggested-contact chip.
    await page.getByRole("button", { name: /Cliente Diego/ }).click();

    // Submit.
    await page.getByRole("button", { name: "Agendar Reunião" }).click();

    // The backend received the create request with the client as attendee + the partner.
    await expect.poll(() => mock.created.length, { timeout: 15_000 }).toBe(1);
    expect(mock.created[0].partnerId).toBe(PARTNER_ID);
    expect(mock.created[0].attendeeEmails).toContain(CLIENT_EMAIL);
    expect(mock.created[0].title).toContain("Call com o cliente");
  });
});
