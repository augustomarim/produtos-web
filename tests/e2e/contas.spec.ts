import { test, expect, type Page } from "@playwright/test";
import { preparar } from "./fixtures";
async function entrar(page: Page, email: string) {
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill("senha123");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/produtos$/);
}
test("trocar de conta limpa produtos, preferências, seleção e formulários anteriores", async ({
  page,
}) => {
  await preparar(page, false);
  await page.goto("/login");
  await entrar(page, "a@example.test");
  await expect(page.locator(".products-table tbody tr")).toHaveCount(3);
  await page.getByRole("textbox", { name: "Buscar produtos" }).fill("Café");
  await expect(page.locator(".products-table tbody tr")).toHaveCount(1);
  await page
    .getByRole("checkbox", { name: "Selecionar Café especial", exact: true })
    .check();
  await page.getByRole("link", { name: "Novo produto", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Código *", exact: true })
    .fill("RASCUNHO-A");
  await page.getByRole("link", { name: "Cancelar", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Descartar e sair", exact: true })
    .click();
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await entrar(page, "b@example.test");
  await expect(
    page.getByRole("heading", {
      name: "Seu catálogo começa aqui",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Buscar produtos" }),
  ).toHaveValue("");
  await expect(
    page.getByRole("region", { name: "Ações dos produtos selecionados" }),
  ).toHaveCount(0);
  await expect(page.getByText("Café especial", { exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "Novo produto", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Código *", exact: true }),
  ).toHaveValue("");
  await page
    .getByRole("textbox", { name: "Código *", exact: true })
    .fill("AG-001");
  await page
    .getByRole("textbox", { name: "Descrição *", exact: true })
    .fill("Produto da conta B");
  await page
    .getByRole("button", { name: "Criar produto", exact: true })
    .click();
  await expect(page.locator(".products-table tbody tr")).toHaveCount(1);
  await expect(page.locator(".products-table tbody")).toContainText(
    "Produto da conta B",
  );
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await entrar(page, "a@example.test");
  await expect(page.locator(".products-table tbody tr")).toHaveCount(3);
  await expect(
    page.getByText("Produto da conta B", { exact: true }),
  ).toHaveCount(0);
});

test("mudança de sessão em outra aba esconde dados e exige nova entrada", async ({
  page,
}) => {
  await preparar(page);
  await page.goto("/produtos");
  await expect(page.locator(".products-table tbody tr")).toHaveCount(3);
  const outraAba = await page.context().newPage();
  await preparar(outraAba, false);
  await outraAba.goto("/login");
  await entrar(outraAba, "b@example.test");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText("Café especial", { exact: true })).toHaveCount(0);
});
