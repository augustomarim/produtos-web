import { test, expect, type Page } from "@playwright/test";
import type { Produto } from "../../src/types/produto";
const token = () =>
  `header.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 900 })).toString("base64url")}.signature`;
const imagem = "/fixture-product.svg";
async function preparar(page: Page, autenticado = true) {
  let loggedIn = autenticado;
  let produtos: Produto[] = [
    {
      id: 1,
      codigo_produto: "AG-001",
      descricao_produto: "Água com gás",
      status: "ativo",
      foto_produto: imagem,
      foto_miniatura: imagem,
      createdAt: "2026-11-01T12:00:00Z",
      updatedAt: "2026-11-02T12:00:00Z",
    },
    {
      id: 2,
      codigo_produto: "CA-002",
      descricao_produto: "Café especial",
      status: "ativo",
      foto_produto: null,
      foto_miniatura: null,
      createdAt: "2026-11-03T12:00:00Z",
      updatedAt: "2026-11-03T12:00:00Z",
    },
    {
      id: 3,
      codigo_produto: "AN-003",
      descricao_produto: "Produto antigo",
      status: "inativo",
      foto_produto: null,
      foto_miniatura: null,
      createdAt: null,
      updatedAt: null,
    },
  ];
  const calls = { refresh: 0, create: 0, status: 0, updates: 0 };
  let rejeitarProximaConsulta = false;
  await page.route("**/fixture-product.svg", (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#e5f2ea"/><rect x="36" y="15" width="28" height="72" rx="8" fill="#3c9b85"/></svg>',
    }),
  );
  await page.route("**/api/**", async (route) => {
    const req = route.request(),
      path = new URL(req.url()).pathname,
      method = req.method();
    if (path === "/api/auth/login") {
      loggedIn = true;
      return route.fulfill({
        json: { token: token(), usuario: { id: 1, nome: "Teste" } },
      });
    }
    if (path === "/api/auth/logout") {
      loggedIn = false;
      return route.fulfill({ status: 204 });
    }
    if (path === "/api/auth/register")
      return route.fulfill({ status: 201, json: { id: 1 } });
    if (path === "/api/auth/refresh") {
      calls.refresh++;
      return route.fulfill(
        loggedIn
          ? { json: { token: token() } }
          : { status: 401, json: { error: "Sessão expirada" } },
      );
    }
    if (!loggedIn)
      return route.fulfill({ status: 401, json: { error: "Sem sessão" } });
    if (path === "/api/produtos" && method === "GET") {
      if (rejeitarProximaConsulta) {
        rejeitarProximaConsulta = false;
        return route.fulfill({
          status: 401,
          json: { error: "Token expirado" },
        });
      }
      await new Promise((resolve) => setTimeout(resolve, 150));
      return route.fulfill({ json: produtos });
    }
    const match = path.match(/^\/api\/produtos\/(\d+)(?:\/(status|foto))?$/);
    const p = match
      ? produtos.find((p) => p.id === Number(match[1]))
      : undefined;
    if (p && match?.[2] === "status") {
      calls.status++;
      await new Promise((resolve) => setTimeout(resolve, 650));
      p.status = p.status === "ativo" ? "inativo" : "ativo";
      p.updatedAt = "2026-11-04T12:00:00Z";
      return route.fulfill({ json: p });
    }
    if (p && match?.[2] === "foto") {
      p.foto_produto = null;
      p.foto_miniatura = null;
      p.updatedAt = "2026-11-04T12:00:00Z";
      return route.fulfill({ json: p });
    }
    if (p && method === "DELETE") {
      produtos = produtos.filter((item) => item.id !== p.id);
      return route.fulfill({ status: 204 });
    }
    if (p && method === "GET") return route.fulfill({ json: p });
    if (
      (p && method === "PUT") ||
      (path === "/api/produtos" && method === "POST")
    ) {
      const raw = req.postDataBuffer();
      const form = await new Response(raw ? new Uint8Array(raw) : null, {
        headers: { "Content-Type": req.headers()["content-type"] },
      }).formData();
      const result: Produto = p || {
        id: Math.max(...produtos.map((item) => item.id)) + 1,
        codigo_produto: "",
        descricao_produto: "",
        status: "ativo",
        foto_produto: null,
        foto_miniatura: null,
        createdAt: "2026-11-04T12:00:00Z",
      };
      result.codigo_produto = String(form.get("codigo_produto"));
      result.descricao_produto = String(form.get("descricao_produto"));
      result.updatedAt =
        method === "PUT" ? "2026-11-04T13:00:00Z" : "2026-11-04T12:00:00Z";
      if (form.has("foto_produto")) {
        result.foto_produto = imagem;
        result.foto_miniatura = imagem;
      }
      if (p) calls.updates++;
      else {
        calls.create++;
        produtos.push(result);
      }
      return route.fulfill({ status: p ? 200 : 201, json: result });
    }
    return route.fulfill({
      status: 404,
      json: { error: "Produto não encontrado" },
    });
  });
  return {
    calls,
    rejeitarConsulta: () => {
      rejeitarProximaConsulta = true;
    },
  };
}

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
  await preparar(page);
  const base = {
    status: "ativo",
    foto_produto: null,
    foto_miniatura: null,
    createdAt: null,
    updatedAt: null,
  };
  await page.route("**/api/produtos", (route) =>
    route.fulfill({
      json: [
        { ...base, id: 1, codigo_produto: "C-001", descricao_produto: "Água" },
        { ...base, id: 2, codigo_produto: "P-002", descricao_produto: "Café" },
        {
          ...base,
          id: 3,
          codigo_produto: "P-003",
          descricao_produto: "Cerveja",
        },
      ],
    }),
  );
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
  await page.route("**/api/produtos", async (route) => {
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
  await page
    .getByLabel("Foto do produto", { exact: true })
    .setInputFiles({
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
