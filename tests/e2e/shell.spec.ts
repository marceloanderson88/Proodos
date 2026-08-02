import { expect, test } from "@playwright/test";

test("landing conduz ao acesso antes da área privada", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Ideias do sertão/ }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Explorar shell demonstrativo" })
    .click();
  await expect(page).toHaveURL(/\/login\?next=/);
  await expect(
    page.getByRole("heading", { name: "Acesse sua conta" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Entrar com Google" }),
  ).toBeVisible();
});

test("callback sem código termina em erro sanitizado", async ({ page }) => {
  await page.goto("/auth/callback");
  await expect(page).toHaveURL(/\/auth\/erro\?code=missing-code/);
  await expect(
    page.getByRole("heading", { name: "Não foi possível concluir" }),
  ).toBeVisible();
});

test("redefinição sem sessão de recuperação é rejeitada", async ({ page }) => {
  await page.goto("/redefinir-senha");
  await expect(page).toHaveURL(/\/auth\/erro\?code=recovery-session-missing/);
});

test("logout não é executável por GET", async ({ request }) => {
  const response = await request.get("/auth/logout", { maxRedirects: 0 });
  expect(response.status()).toBe(405);
});
