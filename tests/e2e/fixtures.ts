import type { Page } from "@playwright/test";
import type { Produto } from "../../src/types/produto";
const token = (id = 1) =>
  `header.${Buffer.from(JSON.stringify({ id, exp: Math.floor(Date.now() / 1000) + 900 })).toString("base64url")}.signature`;
const imagem = "/fixture-product.svg";
export async function preparar(
  page: Page,
  autenticado = true,
  iniciais?: Produto[],
) {
  let loggedIn = autenticado;
  let contaAtiva = 1;
  let produtos: Produto[] = iniciais || [
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
  const catalogos = new Map<number, Produto[]>([
    [1, produtos],
    [2, []],
  ]);
  const calls = {
    refresh: 0,
    create: 0,
    status: 0,
    updates: 0,
    bulk: 0,
    bulkDelete: 0,
  };
  const consultas: URLSearchParams[] = [];
  let ultimoLote: { ids: number[]; status?: string } | null = null;
  let falharLote = false;
  let desaparecerId: number | null = null;
  let fotosFalhas = 0;
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
      catalogos.set(contaAtiva, produtos);
      contaAtiva = req.postDataJSON().email === "b@example.test" ? 2 : 1;
      produtos = catalogos.get(contaAtiva) || [];
      loggedIn = true;
      return route.fulfill({
        json: {
          token: token(contaAtiva),
          usuario: { id: contaAtiva, nome: "Teste" },
        },
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
          ? { json: { token: token(contaAtiva) } }
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
      const q = new URL(req.url()).searchParams;
      consultas.push(q);
      if (q.has("pagina")) {
        const normal = (s: string) =>
          s
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();
        const filtro = q.get("status") || "todos",
          busca = normal(q.get("busca") || "");
        const filtrados = produtos.filter(
          (p) =>
            (filtro === "todos" || p.status === filtro) &&
            normal(p.descricao_produto).includes(busca),
        );
        const ordem = q.get("ordem") || "atualizados";
        filtrados.sort((a, b) => {
          if (a.status !== b.status) return a.status === "ativo" ? -1 : 1;
          if (ordem === "codigo")
            return (
              a.codigo_produto.localeCompare(b.codigo_produto) || b.id - a.id
            );
          const campo = ordem === "criados" ? "createdAt" : "updatedAt";
          return (
            (Date.parse(b[campo] || "") || 0) -
              (Date.parse(a[campo] || "") || 0) || b.id - a.id
          );
        });
        const limite = Number(q.get("limite")) || 25,
          paginas = Math.max(1, Math.ceil(filtrados.length / limite)),
          pagina = Math.min(Number(q.get("pagina")) || 1, paginas);
        const ativos = produtos.filter((p) => p.status === "ativo").length;
        return route.fulfill({
          json: {
            produtos: filtrados.slice((pagina - 1) * limite, pagina * limite),
            total: filtrados.length,
            pagina,
            paginas,
            limite,
            resumo: {
              total: produtos.length,
              ativos,
              inativos: produtos.length - ativos,
            },
          },
        });
      }
      return route.fulfill({ json: produtos });
    }
    if (
      (path === "/api/produtos/status" && method === "PATCH") ||
      (path === "/api/produtos" && method === "DELETE")
    ) {
      const dados = req.postDataJSON() as {
        ids: number[];
        status?: "ativo" | "inativo";
      };
      ultimoLote = dados;
      if (method === "PATCH") calls.bulk++;
      else calls.bulkDelete++;
      await new Promise((resolve) => setTimeout(resolve, 350));
      if (falharLote) {
        falharLote = false;
        return route.fulfill({
          status: 500,
          json: { error: "Falha simulada no lote" },
        });
      }
      if (desaparecerId !== null) {
        produtos = produtos.filter((p) => p.id !== desaparecerId);
        desaparecerId = null;
      }
      const ids = [...new Set(dados.ids)];
      const afetados = produtos.filter((p) => ids.includes(p.id));
      if (method === "PATCH") {
        for (const p of afetados) {
          p.status = dados.status!;
          p.updatedAt = "2026-11-05T12:00:00Z";
        }
        return route.fulfill({
          json: {
            solicitados: ids.length,
            afetados: afetados.length,
            produtos: afetados,
          },
        });
      }
      produtos = produtos.filter((p) => !ids.includes(p.id));
      return route.fulfill({
        json: {
          solicitados: ids.length,
          afetados: afetados.length,
          idsExcluidos: afetados.map((p) => p.id),
          fotosNaoRemovidas: fotosFalhas,
        },
      });
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
    consultas: () => consultas,
    ultimoLote: () => ultimoLote,
    falharProximoLote: () => {
      falharLote = true;
    },
    removerAntesDoLote: (id: number) => {
      desaparecerId = id;
    },
    falharFotos: () => {
      fotosFalhas = 1;
    },
    rejeitarConsulta: () => {
      rejeitarProximaConsulta = true;
    },
  };
}
