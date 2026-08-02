import { expect, test } from "@playwright/test";

const email = process.env.E2E_TEST_EMAIL;
const password = process.env.E2E_TEST_PASSWORD;

test.describe("smoke autenticado", () => {
  test.skip(
    !email || !password,
    "Credenciais sintéticas E2E não configuradas.",
  );

  test("login seleciona tenant autorizado, abre dashboard e bloqueia tenant cruzado", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("E-mail").fill(email ?? "");
    await page.getByLabel("Senha", { exact: true }).fill(password ?? "");
    await page.getByRole("button", { name: "Entrar", exact: true }).click();

    await expect(page).toHaveURL(/\/o\/seed-org-a\/dashboard$/);
    await expect(page.getByRole("heading", { name: /Olá,/ })).toBeVisible();
    await expect(page.getByText("DADOS DEMONSTRATIVOS")).toBeVisible();

    await page.goto("/o/seed-org-b/dashboard");
    await expect(page).toHaveURL(/\/o\/seed-org-a\/dashboard$/);

    await page.getByRole("button", { name: "Sair da conta" }).click();
    await expect(page).toHaveURL(/\/login$/);
  });
});
