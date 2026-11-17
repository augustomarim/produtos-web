import { test, expect } from "@playwright/test";
import { preparar } from "./fixtures";
const inicial = {
  id: 1,
  produtoId: 1,
  codigo: "P-1",
  descricao: "Café",
  acao: "editado",
  campos: ["descricao", "imagem"],
  origem: "mobile",
  revisao: 2,
  ocorreuEm: "2026-11-17T15:30:00Z",
  lida: false,
};
test("histórico mantém edições após exclusão e leitura não marca o evento novo", async ({
  page,
}) => {
  await preparar(page);
  let eventos = [{ ...inicial }];
  let falhar = true;
  const enviados: unknown[] = [];
  await page.route("**/api/notificacoes**", async (route) => {
    if (route.request().method() === "PATCH") {
      enviados.push(route.request().postDataJSON());
      if (falhar) {
        falhar = false;
        return route.fulfill({
          status: 500,
          json: { error: "Falha simulada de leitura" },
        });
      }
      eventos = [
        { ...inicial, id: 2, revisao: 1, acao: "removido", campos: [] },
        { ...inicial, lida: true },
      ];
      return route.fulfill({ json: { afetadas: 1 } });
    }
    return route.fulfill({
      json: {
        notificacoes: eventos,
        naoLidas: 1,
        total: eventos.length,
        pagina: 1,
        paginas: 1,
      },
    });
  });
  await page.goto("/produtos");
  await page
    .getByRole("button", { name: "Notificações, 1 não lidas", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByText("Alterações: descrição, imagem.", { exact: true }),
  ).toBeVisible();
  await expect(dialog.getByText(/Pelo aplicativo/)).toBeVisible();
  await dialog
    .getByRole("button", { name: "Marcar exibidas como lidas", exact: true })
    .click();
  await expect(
    dialog.getByText("Falha simulada de leitura", { exact: true }),
  ).toBeVisible();
  await expect(dialog.getByText("Não lida", { exact: true })).toBeVisible();
  await dialog
    .getByRole("button", { name: "Marcar exibidas como lidas", exact: true })
    .click();
  await expect(
    dialog.getByText("Produto removido", { exact: true }),
  ).toBeVisible();
  await expect(dialog.getByText("Não lida", { exact: true })).toBeVisible();
  await expect(
    dialog.getByText("Alterações: descrição, imagem.", { exact: true }),
  ).toBeVisible();
  await expect(dialog.getByText("Lida", { exact: true })).toBeVisible();
  await expect(dialog.locator("li")).toHaveCount(2);
  expect(enviados).toEqual([
    { notificacoes: [{ id: 1, revisao: 2 }] },
    { notificacoes: [{ id: 1, revisao: 2 }] },
  ]);
  await dialog
    .getByRole("button", { name: "Fechar notificações", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
});
test("paginação permite consultar e marcar avisos além da primeira página", async ({
  page,
}) => {
  await preparar(page);
  await page.route("**/api/notificacoes**", async (route) => {
    const pagina = Number(
      new URL(route.request().url()).searchParams.get("pagina") || 1,
    );
    return route.fulfill({
      json: {
        notificacoes: [
          {
            ...inicial,
            id: pagina,
            descricao: pagina === 1 ? "Recente" : "Mais antigo",
          },
        ],
        total: 51,
        naoLidas: 51,
        pagina,
        paginas: 2,
      },
    });
  });
  await page.goto("/produtos");
  await page.getByRole("button", { name: /^Notificações/ }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Recente", { exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Próximas", exact: true }).click();
  await expect(dialog.getByText("Mais antigo", { exact: true })).toBeVisible();
  await expect(
    dialog.getByText("Página 2 de 2", { exact: true }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Anteriores", exact: true }).click();
  await expect(dialog.getByText("Recente", { exact: true })).toBeVisible();
});
