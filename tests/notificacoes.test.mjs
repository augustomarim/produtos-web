import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
const js = ts.transpile(
  await readFile(
    new URL("../src/lib/notificacoes.ts", import.meta.url),
    "utf8",
  ),
  { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
);
const m = await import(
  "data:text/javascript;base64," + Buffer.from(js).toString("base64")
);
test("cada evento mostra sua operação e seus próprios campos", () => {
  for (const [acao, titulo] of [
    ["criado", "Produto criado"],
    ["removido", "Produto removido"],
  ]) {
    const n = { acao, campos: ["descricao", "imagem"] };
    assert.equal(m.tituloNotificacao(n), titulo);
    assert.equal(m.detalhesNotificacao(n), "");
  }
});
test("edição descreve campos e status sem valores antigos, inclusive imagem", () => {
  assert.equal(
    m.detalhesNotificacao({
      acao: "editado",
      campos: ["codigo", "descricao", "imagem", "inativado"],
    }),
    "Alterações: código, descrição, imagem, inativado.",
  );
  assert.equal(
    m.detalhesNotificacao({ acao: "editado", campos: ["ativado"] }),
    "Alterações: ativado.",
  );
});
test("origem distingue site, aplicativo e API", () => {
  assert.equal(m.origemNotificacao({ origem: "web" }), "Pelo site");
  assert.equal(m.origemNotificacao({ origem: "mobile" }), "Pelo aplicativo");
  assert.equal(m.origemNotificacao({ origem: "api" }), "Pela API");
});
test("histórico pode conter ambas as origens mas alertas são somente da oposta", () => {
  const eventos = [
    { id: 1, origem: "web" },
    { id: 2, origem: "mobile" },
    { id: 3, origem: "api" },
  ];
  assert.deepEqual(
    m.eventosParaAlertar(eventos, "web").map((n) => n.id),
    [2],
  );
  assert.deepEqual(
    m.eventosParaAlertar(eventos, "mobile").map((n) => n.id),
    [1],
  );
  assert.equal(eventos.length, 3);
});
test("um lote tem aviso único com a operação correta", () => {
  assert.equal(
    m.tituloAviso([
      { acao: "removido", campos: [] },
      { acao: "removido", campos: [] },
    ]),
    "2 produtos removidos",
  );
  assert.equal(
    m.tituloAviso([
      { acao: "editado", campos: ["inativado"] },
      { acao: "editado", campos: ["inativado"] },
    ]),
    "2 produtos inativados",
  );
});
