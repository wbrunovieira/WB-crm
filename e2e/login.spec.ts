import { test, expect } from "@playwright/test";

// Smoke E2E do frontend. A página /login é client-side ("use client"), então
// renderiza sem depender do backend. O submit com credencial inválida sempre
// falha (junk) e mostra a mensagem de erro — logo, também não depende do backend.

test.describe("/login", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("renderiza o formulário de login", async ({ page }) => {
    await expect(page).toHaveTitle(/WB CRM/);
    await expect(page.getByRole("heading", { name: "WB CRM" })).toBeVisible();
    await expect(page.getByText("Entre na sua conta")).toBeVisible();
    await expect(page.getByPlaceholder("seu@email.com")).toBeVisible();
    await expect(page.getByPlaceholder("••••••••")).toBeVisible();
    await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
  });

  test("alterna a visibilidade da senha (olho)", async ({ page }) => {
    const senha = page.getByPlaceholder("••••••••");
    await senha.fill("segredo123");
    await expect(senha).toHaveAttribute("type", "password");

    // o único button type="button" da página é o toggle do olho
    await page.locator('button[type="button"]').click();
    await expect(senha).toHaveAttribute("type", "text");

    await page.locator('button[type="button"]').click();
    await expect(senha).toHaveAttribute("type", "password");
  });

  test("mostra erro ao enviar credenciais inválidas", async ({ page }) => {
    await page.getByPlaceholder("seu@email.com").fill("naoexiste@example.com");
    await page.getByPlaceholder("••••••••").fill("senha-invalida-de-teste");
    await page.getByRole("button", { name: "Entrar" }).click();

    await expect(page.getByText("Email ou senha inválidos")).toBeVisible({ timeout: 15_000 });
    // continua na tela de login (não navegou pro dashboard)
    await expect(page).toHaveURL(/\/login/);
  });
});
