import { expect, test } from "@playwright/test";

const email = process.env.E2E_TEST_EMAIL;
const password = process.env.E2E_TEST_PASSWORD;

test.describe("smoke autenticado", () => {
  test.skip(
    !email || !password,
    "Credenciais sintéticas E2E não configuradas.",
  );

  test("login abre o Proodos, entra na incubadora autorizada e bloqueia tenant cruzado", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("E-mail").fill(email ?? "");
    await page.getByLabel("Senha", { exact: true }).fill(password ?? "");
    await page.getByRole("button", { name: "Entrar", exact: true }).click();

    await expect(page).toHaveURL(/\/o$/);
    await expect(
      page.getByRole("heading", {
        name: /Governe a rede\. Cada incubadora conduz sua própria operação\./,
      }),
    ).toBeVisible();

    const incubatorPath = "/o/seed-org-a/i/incubadora-sintetica-sertao";

    await page.goto(`${incubatorPath}/programas`);
    await expect(
      page.getByRole("heading", { name: "Programas e turmas" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Ciclo Sintético 2026", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Dados reais · Supabase")).toBeVisible();

    await page.goto(`${incubatorPath}/startups`);
    await expect(
      page.getByRole("heading", { name: "Startups e equipes" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Agro Sintética", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Portfólio real e protegido")).toBeVisible();

    await page.goto("/o/seed-org-b/i/incubadora-sintetica-sertao/dashboard");
    await expect(page).toHaveURL(/\/o$/);

    await page.getByRole("button", { name: "Sair", exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);
  });
});
