import { test, expect } from "@playwright/test";
import { preparar } from "./fixtures";

test("botões permanecem visíveis e status mantém ativos acima dos inativos", async ({
  page,
}) => {
  const mock = await preparar(page, false);
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill("teste@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("senha-teste");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Seus produtos" }),
  ).toBeVisible();
  const rows = page.locator(".products-table tbody tr");
  await expect(rows).toHaveCount(3);
  await expect(rows.first()).toContainText("Café especial");
  expect(mock.calls.refresh).toBe(0);
  const novo = page.getByRole("link", { name: "Novo produto", exact: true });
  const pos = await novo.evaluate(
    (e) => e.getBoundingClientRect().top + scrollY,
  );
  await page
    .getByRole("button", { name: "Inativar Água com gás", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Inativar Água com gás", exact: true }),
  ).toContainText("Atualizando…");
  await expect(novo).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Editar", exact: true }),
  ).toHaveCount(3);
  const durante = await novo.evaluate(
    (e) => e.getBoundingClientRect().top + scrollY,
  );
  expect(durante).toBe(pos);
  await expect(rows.first()).toContainText("Café especial");
  await expect(rows.nth(1)).toContainText("Água com gás");
  await expect(rows.nth(1)).toContainText("Inativo");
  await expect(rows.nth(2)).toContainText("Produto antigo");
  expect(mock.calls.refresh).toBe(0);
  expect(mock.calls.status).toBe(1);
  await page
    .getByRole("button", { name: "Ativar Água com gás", exact: true })
    .click();
  await expect(rows.first()).toContainText("Água com gás");
  await expect(rows.first()).toContainText("Ativo");
  expect(mock.calls.status).toBe(2);
  await page.getByLabel("Ordenar por").selectOption("criados");
  await expect(rows.first()).toContainText("Café especial");
  mock.rejeitarConsulta();
  await page.getByRole("button", { name: "Atualizar", exact: true }).click();
  await expect(rows).toHaveCount(3);
  await expect(
    page.getByRole("status").filter({ hasText: "Atualizando lista" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Atualizar", exact: true }),
  ).toBeEnabled();
  expect(mock.calls.refresh).toBe(1);
  await page.screenshot({
    path: test.info().outputPath("desktop.png"),
    fullPage: true,
  });
});

test("formulários validam fotos, criam e editam; remoção preserva o produto", async ({
  page,
}) => {
  const mock = await preparar(page);
  await page.goto("/produtos/novo");
  await page.getByLabel("Código *", { exact: true }).fill("TEST-4");
  await page
    .getByRole("textbox", { name: "Descrição *", exact: true })
    .fill("Produto novo");
  await page.getByLabel("Foto do produto", { exact: true }).setInputFiles({
    name: "grande.png",
    mimeType: "image/png",
    buffer: Buffer.alloc(4 * 1024 * 1024 + 1),
  });
  await expect(page.locator("main [role=alert]")).toContainText("4 MB");
  await page
    .getByRole("button", { name: "Criar produto", exact: true })
    .click();
  expect(mock.calls.create).toBe(0);
  await page.getByRole("button", { name: "Remover seleção inválida" }).click();
  await page
    .getByRole("button", { name: "Criar produto", exact: true })
    .click();
  await expect(page).toHaveURL(/\/produtos$/);
  await expect(page.locator(".products-table tbody tr").first()).toContainText(
    "Produto novo",
  );
  expect(mock.calls.create).toBe(1);
  await page.goto("/produtos/1/editar");
  await expect(
    page.getByRole("textbox", { name: "Descrição *", exact: true }),
  ).toHaveValue("Água com gás");
  await page
    .getByRole("textbox", { name: "Descrição *", exact: true })
    .fill("Água atualizada");
  await page.screenshot({
    path: test.info().outputPath("form.png"),
    fullPage: true,
  });
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Remover foto atual", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Foto removida");
  await expect(
    page.getByRole("textbox", { name: "Descrição *", exact: true }),
  ).toHaveValue("Água atualizada");
  await page
    .getByRole("button", { name: "Salvar alterações", exact: true })
    .click();
  await expect(page).toHaveURL(/\/produtos$/);
  await expect(page.locator(".products-table tbody tr").first()).toContainText(
    "Água atualizada",
  );
  expect(mock.calls.updates).toBe(1);
});

test("mobile sem rolagem horizontal, busca, filtros e logout", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await preparar(page);
  await page.goto("/produtos");
  await expect(page.locator(".mobile-product")).toHaveCount(3);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: test.info().outputPath("mobile.png"),
    fullPage: true,
  });
  await page.getByRole("textbox", { name: "Buscar produtos" }).fill("antigo");
  await expect(page.locator(".mobile-product")).toHaveCount(1);
  await expect(page.locator(".mobile-product")).toContainText("Não registrada");
  await page.getByRole("textbox", { name: "Buscar produtos" }).fill("");
  await page
    .getByRole("combobox", { name: "Filtrar por status", exact: true })
    .selectOption("inativo");
  await expect(page.locator(".mobile-product")).toHaveCount(1);
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/produtos");
  await expect(page).toHaveURL(/\/login$/);
});

test("buscar C mostra Café e Cerveja imediatamente, sem Água cujo código tem C", async ({
  page,
}) => {
  await preparar(page, true, [
    {
      id: 1,
      codigo_produto: "C-001",
      descricao_produto: "Água",
      status: "ativo",
      foto_produto: null,
      foto_miniatura: null,
    },
    {
      id: 2,
      codigo_produto: "P-002",
      descricao_produto: "Café",
      status: "ativo",
      foto_produto: null,
      foto_miniatura: null,
    },
    {
      id: 3,
      codigo_produto: "P-003",
      descricao_produto: "Cerveja",
      status: "ativo",
      foto_produto: null,
      foto_miniatura: null,
    },
  ]);
  await page.goto("/produtos");
  const rows = page.locator(".products-table tbody tr");
  await expect(rows).toHaveCount(3);
  const busca = page.getByRole("textbox", { name: "Buscar produtos" });
  await busca.fill("C");
  await expect(rows).toHaveCount(2);
  await expect(rows).toContainText(["Cerveja", "Café"]);
  await busca.fill("CA");
  await expect(rows).toHaveCount(1);
  await expect(rows).toContainText(["Café"]);
  await busca.fill("agua");
  await expect(rows).toHaveCount(1);
  await expect(rows).toContainText(["Água"]);
  await busca.fill("");
  await expect(rows).toHaveCount(3);
});

test("dois cadastros seguidos limpam campos e foto sem atualizar o navegador", async ({
  page,
}) => {
  const mock = await preparar(page);
  let liberarEnvio!: () => void;
  const envioPendente = new Promise<void>((resolve) => {
    liberarEnvio = resolve;
  });
  await page.route(/\/api\/produtos(?:\?.*)?$/, async (route) => {
    if (route.request().method() === "POST") await envioPendente;
    await route.fallback();
  });
  await page.goto("/produtos");
  await page.getByRole("link", { name: "Novo produto", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Código *", exact: true })
    .fill("NOVO-01");
  await page
    .getByRole("textbox", { name: "Descrição *", exact: true })
    .fill("Primeiro cadastro");
  await page.getByLabel("Foto do produto", { exact: true }).setInputFiles({
    name: "foto.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aNEkAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await page
    .getByRole("button", { name: "Criar produto", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Salvando…", exact: true }),
  ).toBeDisabled();
  liberarEnvio();
  await expect(page).toHaveURL(/\/produtos$/);
  await expect(page.locator(".products-table tbody")).toContainText(
    "Primeiro cadastro",
  );
  await page.getByRole("link", { name: "Novo produto", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Código *", exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByRole("textbox", { name: "Código *", exact: true }),
  ).toHaveValue("");
  await expect(
    page.getByRole("textbox", { name: "Descrição *", exact: true }),
  ).toHaveValue("");
  await expect(
    page.getByRole("img", { name: "Pré-visualização da nova foto" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Criar produto", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("textbox", { name: "Código *", exact: true })
    .fill("NOVO-02");
  await page
    .getByRole("textbox", { name: "Descrição *", exact: true })
    .fill("Segundo cadastro");
  await page
    .getByRole("button", { name: "Criar produto", exact: true })
    .click();
  await expect(page).toHaveURL(/\/produtos$/);
  await expect(page.locator(".products-table tbody")).toContainText(
    "Segundo cadastro",
  );
  expect(mock.calls.create).toBe(2);
});
