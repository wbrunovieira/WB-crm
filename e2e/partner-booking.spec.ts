import { test, expect } from "@playwright/test";
import {
  startMockBackend,
  PARTNER_TOKEN,
  PARTNER_EMAIL,
  OWNER_EMAIL,
  type MockBackend,
} from "./support/booking-mock-backend";

// Fuso fixo p/ o horário exibido ser determinístico (12:00Z → 09:00 BRT).
test.use({ timezoneId: "America/Sao_Paulo" });

let mock: MockBackend;

test.beforeAll(async () => {
  mock = await startMockBackend(3010);
});
test.afterAll(async () => {
  await mock?.close();
});

test.describe("Auto-agendamento de PARTNER (E2E frontend)", () => {
  test("partner abre o link → escolhe horário → preenche → agenda; confirmação p/ o partner e p/ nós", async ({ page }) => {
    await page.goto(`/book/${PARTNER_TOKEN}`);

    // Página resolveu o PARTNER (dados vieram do fetch server-side → mock).
    await expect(page.getByText(/Olá, Agência/)).toBeVisible();
    await expect(page.getByText("Reunião 30min")).toBeVisible();

    // Escolhe um horário (09:00 BRT).
    await page.getByRole("button", { name: "09:00" }).click();

    // Formulário: nome + whatsapp (o e-mail já vem preenchido com o do partner).
    await page.getByPlaceholder("Seu nome").fill("João da Agência");
    await expect(page.getByPlaceholder("Seu e-mail")).toHaveValue(PARTNER_EMAIL);
    await page.getByPlaceholder("WhatsApp (DDD + número)").fill("(24) 99999-0000");

    // Confirma.
    await page.getByRole("button", { name: /Confirmar/ }).click();

    // Tela de sucesso (o partner vê a confirmação do agendamento).
    await expect(page.getByRole("heading", { name: /Reunião confirmada/ })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Enviamos um convite para o seu e-mail/)).toBeVisible();
    await expect(page.getByRole("link", { name: /Entrar no Google Meet/ })).toBeVisible();

    // O backend recebeu o agendamento correto.
    expect(mock.bookings).toHaveLength(1);
    expect(mock.bookings[0].mode).toBe("online");
    expect(mock.bookings[0].attendeeEmail).toBe(PARTNER_EMAIL);
    expect(mock.bookings[0].attendeeName).toBe("João da Agência");
    expect(mock.bookings[0].startISO).toBeTruthy();

    // Confirmação vai para OS DOIS: convidado (partner) + organizador (nós).
    expect(mock.lastRecipients).toContain(PARTNER_EMAIL);
    expect(mock.lastRecipients).toContain(OWNER_EMAIL);
  });
});
