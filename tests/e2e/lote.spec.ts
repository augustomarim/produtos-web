import { test, expect } from "@playwright/test";
import { preparar } from "./fixtures";

test("seleção parcial, selecionar todos visíveis e exclusão cancelada", async ({
  page,
}) => {
  const mock = await preparar(page);
  await page.goto("/produtos");
  const todos = page.getByRole("checkbox", {
    name: "Selecionar todos os produtos visíveis",
    exact: true,
  });
  await page
    .getByRole("checkbox", { name: "Selecionar Café especial", exact: true })
    .check();
  await expect(todos).toBeChecked({ indeterminate: true });
  await page
    .getByRole("checkbox", { name: "Selecionar Água com gás", exact: true })
    .check();
  await expect(
    page.getByRole("region", { name: "Ações dos produtos selecionados" }),
  ).toContainText("2 selecionados");
  await page.getByRole("textbox", { name: "Buscar produtos" }).fill("cafe");
  await expect(
    page.getByRole("region", { name: "Ações dos produtos selecionados" }),
  ).toContainText("1 selecionado");
  await expect(todos).toBeChecked();
  await page.getByRole("textbox", { name: "Buscar produtos" }).fill("");
  await expect(
    page.getByRole("checkbox", {
      name: "Selecionar Água com gás",
      exact: true,
    }),
  ).not.toBeChecked();
  await page
    .getByRole("combobox", { name: "Filtrar por status", exact: true })
    .selectOption("inativo");
  await expect(
    page.getByRole("region", { name: "Ações dos produtos selecionados" }),
  ).toHaveCount(0);
  await todos.check();
  await expect(
    page.getByRole("region", { name: "Ações dos produtos selecionados" }),
  ).toContainText("1 selecionado");
  page.once("dialog", (d) => {
    expect(d.message()).toContain("1 produto selecionado");
    void d.dismiss();
  });
  await page
    .getByRole("button", { name: "Excluir selecionados", exact: true })
    .click();
  expect(mock.calls.bulkDelete).toBe(0);
  await expect(todos).toBeChecked();
  await page
    .getByRole("button", { name: "Limpar seleção", exact: true })
    .click();
  await expect(todos).not.toBeChecked();
});

test("status explícito em seleção mista usa uma chamada e limpa seleção", async ({
  page,
}) => {
  const mock = await preparar(page);
  await page.goto("/produtos");
  await page
    .getByRole("checkbox", { name: "Selecionar Café especial", exact: true })
    .check();
  await page
    .getByRole("checkbox", { name: "Selecionar Produto antigo", exact: true })
    .check();
  await page
    .getByRole("button", { name: "Inativar selecionados", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Inativar selecionados", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("link", { name: "Novo produto", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Ações dos produtos selecionados" }),
  ).toHaveCount(0);
  expect(mock.calls.bulk).toBe(1);
  expect(mock.calls.status).toBe(0);
  expect(mock.ultimoLote()).toEqual({ ids: [2], status: "inativo" });
  const rows = page.locator(".products-table tbody tr");
  await expect(rows.filter({ hasText: "Café especial" })).toContainText(
    "Inativo",
  );
  await expect(rows.filter({ hasText: "Produto antigo" })).toContainText(
    "Inativo",
  );
  await expect(rows.first()).toContainText("Água com gás");
  await page
    .getByRole("checkbox", {
      name: "Selecionar todos os produtos visíveis",
      exact: true,
    })
    .check();
  await page
    .getByRole("button", { name: "Ativar selecionados", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Ações dos produtos selecionados" }),
  ).toHaveCount(0);
  await expect(
    page.locator(".products-table .status-badge.inativo"),
  ).toHaveCount(0);
  expect(mock.calls.bulk).toBe(2);
});

test("falha mantém seleção; exclusão parcial informa quantidades e falha de fotos", async ({
  page,
}) => {
  const mock = await preparar(page);
  await page.goto("/produtos");
  await page
    .getByRole("checkbox", {
      name: "Selecionar todos os produtos visíveis",
      exact: true,
    })
    .check();
  mock.falharProximoLote();
  await page
    .getByRole("button", { name: "Ativar selecionados", exact: true })
    .click();
  await expect(page.locator("main [role=alert]")).toContainText(
    "Falha simulada",
  );
  await expect(
    page.getByRole("region", { name: "Ações dos produtos selecionados" }),
  ).toContainText("3 selecionados");
  mock.removerAntesDoLote(3);
  mock.falharFotos();
  page.once("dialog", (d) => {
    expect(d.message()).toContain("3 produtos selecionados");
    void d.accept();
  });
  await page
    .getByRole("button", { name: "Excluir selecionados", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Ações dos produtos selecionados" }),
  ).toHaveCount(0);
  await expect(
    page.locator("main [role=status]").filter({ hasText: "2 de 3" }),
  ).toContainText("foto(s) não puderam");
  await expect(page.locator(".products-table tbody tr")).toHaveCount(0);
  expect(mock.calls.bulkDelete).toBe(1);
});

test("mobile mantém seleção e ações em lote sem overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await preparar(page);
  await page.goto("/produtos");
  await page
    .getByRole("checkbox", {
      name: "Selecionar todos os produtos visíveis",
      exact: true,
    })
    .check();
  const barra = page.getByRole("region", {
    name: "Ações dos produtos selecionados",
  });
  await expect(barra).toBeVisible();
  await expect(barra).toContainText("3 selecionados");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: test.info().outputPath("lote-mobile.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Inativar selecionados", exact: true })
    .click();
  await expect(barra).toHaveCount(0);
  await expect(page.locator(".mobile-product .status-badge.ativo")).toHaveCount(
    0,
  );
});

test("selecionar todos marca apenas a página atual, até 100", async ({
  page,
}) => {
  const dados = Array.from({ length: 101 }, (_, i) => ({
    id: i + 1,
    codigo_produto: `L-${i}`,
    descricao_produto: `Produto ${i}`,
    status: "ativo" as const,
    foto_produto: null,
    foto_miniatura: null,
  }));
  await preparar(page, true, dados);
  await page.goto("/produtos");
  const todos = page.getByRole("checkbox", {
    name: "Selecionar todos os produtos visíveis",
    exact: true,
  });
  await todos.check();
  await expect(
    page.getByRole("region", { name: "Ações dos produtos selecionados" }),
  ).toContainText("25 selecionados");
  await expect(page.locator(".products-table tbody tr")).toHaveCount(25);
  await page
    .getByRole("button", { name: "Limpar seleção", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Produtos por página" })
    .selectOption("100");
  await todos.check();
  await expect(
    page.getByRole("region", { name: "Ações dos produtos selecionados" }),
  ).toContainText("100 selecionados");
  await page
    .getByRole("button", { name: "Limpar seleção", exact: true })
    .click();
  await page.getByRole("button", { name: "Próxima", exact: true }).click();
  await expect(page.locator(".products-table tbody tr")).toHaveCount(1);
  await expect(todos).not.toBeChecked();
});
