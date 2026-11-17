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
test("criação/exclusão mostram somente a última operação, sem detalhes de edições anteriores", () => {
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
