import { test, expect } from "@playwright/test";
import { preparar } from "./fixtures";

const dados = Array.from({ length: 31 }, (_, i) => ({
  id: i + 1,
  codigo_produto: `P-${String(i + 1).padStart(3, "0")}`,
  descricao_produto: `Produto ${i + 1}`,
  status: "ativo" as const,
  foto_produto: null,
  foto_miniatura: null,
}));

test("status homogêneo desabilita ação e confirmação lista nomes e excedentes", async ({
  page,
}) => {
  await preparar(page, true, dados);
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
  await expect(barra).toContainText("25 ativos");
  await expect(
    page.getByRole("button", { name: "Ativar selecionados", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Inativar selecionados", exact: true }),
  ).toBeEnabled();
  page.once("dialog", async (d) => {
    expect(d.message()).toContain("Produto");
    expect(d.message()).toContain("mais 20 produtos");
    await d.dismiss();
  });
  await page
    .getByRole("button", { name: "Excluir selecionados", exact: true })
    .click();
  await expect(barra).toBeVisible();
});

test("paginação e critérios persistem ao editar e recarregar; busca encontra fora da página", async ({
  page,
}) => {
  await preparar(page, true, dados);
  await page.goto("/produtos");
  await page.getByLabel("Ordenar por").selectOption("codigo");
  await page
    .getByRole("combobox", { name: "Produtos por página" })
    .selectOption("10");
  await page.getByRole("button", { name: "Próxima", exact: true }).click();
  await expect(
    page.getByRole("status", { name: "Página atual" }),
  ).toContainText("2 de 4");
  const rows = page.locator(".products-table tbody tr");
  await expect(rows.first()).toContainText("P-011");
  await rows.first().getByRole("link", { name: "Editar", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Descrição *", exact: true }),
  ).toHaveValue("Produto 11");
  await page
    .getByRole("button", { name: "Salvar alterações", exact: true })
    .click();
  await expect(page).toHaveURL(/\/produtos$/);
  await expect(
    page.getByRole("status", { name: "Página atual" }),
  ).toContainText("2 de 4");
  await expect(page.getByLabel("Ordenar por")).toHaveValue("codigo");
  await page.reload();
  await expect(rows.first()).toContainText("P-011");
  await page
    .getByRole("textbox", { name: "Buscar produtos" })
    .fill("Produto 31");
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("P-031");
  await expect(
    page.getByRole("status", { name: "Página atual" }),
  ).toContainText("1 de 1");
});

test("excluir último item da página volta para uma página válida", async ({
  page,
}) => {
  await preparar(page, true, dados.slice(0, 11));
  await page.goto("/produtos");
  await page
    .getByRole("combobox", { name: "Produtos por página" })
    .selectOption("10");
  await page.getByRole("button", { name: "Próxima", exact: true }).click();
  await expect(page.locator(".products-table tbody tr")).toHaveCount(1);
  page.once("dialog", (d) => d.accept());
  await page
    .locator(".products-table tbody tr")
    .getByRole("button", { name: /^Excluir / })
    .click();
  await expect(
    page.getByRole("status", { name: "Página atual" }),
  ).toContainText("1 de 1");
  await expect(page.locator(".products-table tbody tr")).toHaveCount(10);
});
