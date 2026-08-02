import { expect, test } from "@playwright/test";

test("landing conduz ao shell demonstrativo", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Ideias do sertão/ }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Explorar shell demonstrativo" })
    .click();
  await expect(page.getByText("Dados demonstrativos")).toBeVisible();
  await expect(
    page.getByText(/sem autenticação ou persistência/),
  ).toBeVisible();
});
