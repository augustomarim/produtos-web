// Local upstream used only by BFF tests. Never calls the deployed backend.
import { createServer } from "node:http";
const server = createServer(async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  if (req.url === "/health") {
    res.end('{"status":"ok"}');
    return;
  }
  if (!req.headers.authorization?.startsWith("Bearer ")) {
    res.statusCode = 401;
    res.end('{"error":"Sem token"}');
    return;
  }
  const url = new URL(req.url, "http://127.0.0.1:3511");
  if (req.method === "GET" && url.pathname === "/produtos") {
    res.end(
      JSON.stringify({
        produtos: [],
        total: 0,
        pagina: 1,
        paginas: 1,
        limite: 25,
        resumo: { total: 0, ativos: 0, inativos: 0 },
        consulta: Object.fromEntries(url.searchParams),
      }),
    );
    return;
  }
  let data;
  try {
    let body = "";
    for await (const chunk of req) body += chunk;
    data = JSON.parse(body);
  } catch {
    res.statusCode = 400;
    res.end('{"error":"JSON inválido"}');
    return;
  }
  if (!Array.isArray(data.ids) || !data.ids.length) {
    res.statusCode = 400;
    res.end('{"error":"IDs inválidos"}');
    return;
  }
  const ids = [...new Set(data.ids)];
  if (req.method === "PATCH" && req.url === "/produtos/status") {
    if (!["ativo", "inativo"].includes(data.status)) {
      res.statusCode = 400;
      res.end('{"error":"Status inválido"}');
      return;
    }
    res.end(
      JSON.stringify({
        solicitados: ids.length,
        afetados: ids.length,
        produtos: ids.map((id) => ({ id, status: data.status })),
      }),
    );
    return;
  }
  if (req.method === "DELETE" && req.url === "/produtos") {
    res.end(
      JSON.stringify({
        solicitados: ids.length,
        afetados: ids.length,
        idsExcluidos: ids,
        fotosNaoRemovidas: 0,
      }),
    );
    return;
  }
  res.statusCode = 404;
  res.end('{"error":"Rota ausente"}');
});
server.listen(3511, "127.0.0.1");
process.on("SIGTERM", () => server.close());
process.on("SIGINT", () => server.close());
