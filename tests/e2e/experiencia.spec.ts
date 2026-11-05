import { test, expect } from "@playwright/test";
import { preparar } from "./fixtures";

test("salvar e cadastrar outro limpa campos, mantém tela e põe foco no código", async ({
  page,
}) => {
  const mock = await preparar(page);
  await page.goto("/produtos/novo");
  const codigo = page.getByRole("textbox", { name: "Código *", exact: true });
  const descricao = page.getByRole("textbox", {
    name: "Descrição *",
    exact: true,
  });
  await codigo.fill("SEQ-01");
  await descricao.fill("Primeiro da sequência");
  await page
    .getByRole("button", { name: "Salvar e cadastrar outro", exact: true })
    .click();
  await expect(codigo).toHaveValue("");
  await expect(codigo).toBeFocused();
  await expect(descricao).toHaveValue("");
  await expect(page).toHaveURL(/\/produtos\/novo$/);
  await expect(page.locator(".toast")).toContainText(
    "Produto criado com sucesso",
  );
  await codigo.fill("SEQ-02");
  await descricao.fill("Segundo da sequência");
  await page
    .getByRole("button", { name: "Criar produto", exact: true })
    .click();
  await expect(page).toHaveURL(/\/produtos$/);
  await expect(page.locator(".products-table tbody")).toContainText(
    "Segundo da sequência",
  );
  expect(mock.calls.create).toBe(2);
  await expect(page.locator(".toast")).toHaveCount(0, { timeout: 9000 });
});

test("cancelar saída preserva formulário e descartar permite sair pelo cabeçalho", async ({
  page,
}) => {
  await preparar(page);
  await page.goto("/produtos/novo");
  const codigo = page.getByRole("textbox", { name: "Código *", exact: true });
  await codigo.fill("RASCUNHO");
  await page.getByRole("link", { name: "Cancelar", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Descartar alterações?" });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Cancelar", exact: true }),
  ).toBeFocused();
  await dialog.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(codigo).toHaveValue("RASCUNHO");
  await page.locator("header .brand").click();
  await dialog
    .getByRole("button", { name: "Descartar e sair", exact: true })
    .click();
  await expect(page).toHaveURL(/\/produtos$/);
});

test("voltar no navegador pede confirmação antes de abandonar o rascunho", async ({
  page,
}) => {
  await preparar(page);
  await page.goto("/produtos");
  await page.getByRole("link", { name: "Novo produto", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Código *", exact: true })
    .fill("PROTEGIDO");
  await page.evaluate(() => history.back());
  await expect(
    page.getByRole("dialog", { name: "Descartar alterações?" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("textbox", { name: "Código *", exact: true }),
  ).toHaveValue("PROTEGIDO");
  await expect(page).toHaveURL(/\/produtos\/novo$/);
  await page.evaluate(() => history.back());
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Descartar e sair", exact: true })
    .click();
  await expect(page).toHaveURL(/\/produtos$/);
  await page.getByRole("link", { name: "Novo produto", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Código *", exact: true }),
  ).toHaveValue("");
});

test("erros ficam nos campos, focam o código e preservam dados após conflito", async ({
  page,
}) => {
  const mock = await preparar(page);
  let falhar = true;
  await page.route(/\/api\/produtos$/, async (route) => {
    if (route.request().method() === "POST" && falhar) {
      falhar = false;
      return route.fulfill({
        status: 409,
        json: { error: "Já existe um produto com este código" },
      });
    }
    await route.fallback();
  });
  await page.goto("/produtos/novo");
  await page
    .getByRole("button", { name: "Criar produto", exact: true })
    .click();
  const codigo = page.getByRole("textbox", { name: "Código *", exact: true });
  await expect(codigo).toHaveAttribute("aria-invalid", "true");
  await expect(codigo).toBeFocused();
  await codigo.fill("DUPLICADO");
  await page
    .getByRole("textbox", { name: "Descrição *", exact: true })
    .fill("Preservar esta descrição");
  await page
    .getByRole("button", { name: "Criar produto", exact: true })
    .click();
  await expect(page.locator("#erro-codigo")).toContainText(
    "já está sendo usado",
  );
  await expect(codigo).toHaveValue("DUPLICADO");
  await expect(codigo).toBeFocused();
  await expect(
    page.getByRole("textbox", { name: "Descrição *", exact: true }),
  ).toHaveValue("Preservar esta descrição");
  expect(mock.calls.create).toBe(0);
  await codigo.fill("UNICO");
  await page
    .getByRole("button", { name: "Criar produto", exact: true })
    .click();
  await expect(page).toHaveURL(/\/produtos$/);
});

test("filtros rápidos, limpar filtros e ampliar foto funcionam no celular", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await preparar(page);
  await page.goto("/produtos");
  const filtros = page.getByRole("group", { name: "Filtrar catálogo" });
  await expect(filtros.getByRole("button", { name: /^Ativos/ })).toContainText(
    "2",
  );
  await filtros.getByRole("button", { name: /^Inativos/ }).click();
  await expect(page.locator(".mobile-product")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Limpar filtros", exact: true })
    .click();
  await expect(page.locator(".mobile-product")).toHaveCount(3);
  const foto = page.getByRole("button", {
    name: "Ampliar foto de Água com gás",
    exact: true,
  });
  await foto.click();
  await expect(
    page.getByRole("dialog", { name: "Foto de Água com gás" }),
  ).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("foto-mobile.png") });
  await page.keyboard.press("Escape");
  await expect(foto).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("pedido lento informa operação e não permite segundo envio", async ({
  page,
}) => {
  const mock = await preparar(page);
  let release!: () => void;
  const wait = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(/\/api\/produtos$/, async (route) => {
    if (route.request().method() === "POST") await wait;
    await route.fallback();
  });
  await page.goto("/produtos/novo");
  await page
    .getByRole("textbox", { name: "Código *", exact: true })
    .fill("LENTO");
  await page
    .getByRole("textbox", { name: "Descrição *", exact: true })
    .fill("Produto lento");
  await page
    .getByRole("button", { name: "Criar produto", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Salvando…", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText("O servidor está demorando para responder.", {
      exact: false,
    }),
  ).toBeVisible({ timeout: 8000 });
  release();
  await expect(page).toHaveURL(/\/produtos$/);
  expect(mock.calls.create).toBe(1);
});

test("cadastro de conta mostra validações perto dos campos", async ({
  page,
}) => {
  await preparar(page, false);
  await page.goto("/cadastro");
  await page.getByRole("button", { name: "Criar conta", exact: true }).click();
  await expect(page.locator("#erro-nome")).toContainText("Informe seu nome");
  await page.getByLabel("Nome", { exact: true }).fill("Augusto");
  await page.getByLabel("Email", { exact: true }).fill("teste@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("senha123");
  await page.getByLabel("Confirmar senha", { exact: true }).fill("diferente");
  await page.getByRole("button", { name: "Criar conta", exact: true }).click();
  await expect(page.locator("#erro-confirmacao")).toContainText(
    "não são iguais",
  );
  await expect(page.getByLabel("Email", { exact: true })).toHaveValue(
    "teste@example.test",
  );
});
