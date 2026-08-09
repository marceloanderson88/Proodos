import { expect, test } from "@playwright/test";

test("jornada de login possui landmarks, nomes acessíveis e foco visível", async ({
  page,
}) => {
  await page.goto("/login");

  await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
  await expect(page.getByRole("main")).toHaveCount(1);
  await expect(page.getByLabel("E-mail")).toBeVisible();
  await expect(page.getByLabel("Senha", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Mostrar senha" }),
  ).toBeVisible();

  await page.keyboard.press("Tab");
  const skipLink = page.getByRole("link", { name: "Ir para o conteúdo" });
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toBeVisible();

  const unnamedControls = await page
    .locator("a, button, input, select, textarea")
    .evaluateAll((elements) =>
      elements
        .filter((element) => {
          const htmlElement = element as HTMLElement;
          const input = element as HTMLInputElement;
          const name =
            htmlElement.getAttribute("aria-label") ||
            htmlElement.getAttribute("aria-labelledby") ||
            htmlElement.textContent?.trim() ||
            input.labels?.[0]?.textContent?.trim();
          return !name;
        })
        .map((element) => element.outerHTML.slice(0, 120)),
    );
  expect(unnamedControls).toEqual([]);
});

test("erros de formulário são associados aos campos", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();

  await expect(page.getByLabel("E-mail")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(page.getByLabel("Senha", { exact: true })).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(page.locator("#email-error")).toBeVisible();
  await expect(page.locator("#password-error")).toBeVisible();
});

test("autocadastro de startup é acessível e responsivo", async ({ page }) => {
  test.skip(
    !process.env.E2E_TEST_EMAIL || !process.env.E2E_TEST_PASSWORD,
    "O cenário depende do banco sintético provisionado no pipeline.",
  );

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/cadastro/startup/seed-org-a/incubadora-sintetica-sertao");

  await expect(
    page.getByRole("heading", { name: "Solicitar entrada" }),
  ).toBeVisible();
  await expect(page.getByLabel("Nome completo")).toBeVisible();
  await expect(page.getByLabel("E-mail")).toBeVisible();
  await expect(page.getByLabel("Senha")).toBeVisible();
  await expect(page.getByLabel("Nome da startup")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Criar conta e solicitar entrada" }),
  ).toBeVisible();

  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport + 1);
});
