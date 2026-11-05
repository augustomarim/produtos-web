import { test } from "node:test";
import assert from "node:assert/strict";
// The storage module is transpiled to exercise the same TS code under Node.
import ts from "typescript";
import { readFile } from "node:fs/promises";
const source = await readFile(
  new URL("../src/lib/catalogo.ts", import.meta.url),
  "utf8",
);
const js = ts
  .transpile(source, {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  })
  .replace(
    '"./produtos"',
    JSON.stringify(new URL("../src/lib/produtos.ts", import.meta.url).href),
  );
const m = await import(
  "data:text/javascript;base64," + Buffer.from(js).toString("base64")
);
import { planejarStatus } from "../src/lib/selecao.ts";
test("preferências inválidas recebem padrões seguros", () => {
  assert.deepEqual(m.validarPreferencias(null), m.PADRAO_CATALOGO);
  const p = m.validarPreferencias({
    pagina: -1,
    limite: 999,
    filtro: "outro",
    ordem: "erro",
    busca: 123,
  });
  assert.deepEqual(p, m.PADRAO_CATALOGO);
  const valido = {
    busca: "cafe",
    pagina: 3,
    limite: 10,
    filtro: "ativo",
    ordem: "codigo",
  };
  assert.deepEqual(m.validarPreferencias(valido), valido);
  assert.match(m.queryCatalogo(valido), /pagina=3/);
});
test("plano de status ignora os já corretos", () => {
  const produtos = Array.from({ length: 7 }, (_, i) => ({
    id: i + 1,
    descricao_produto: `Nome ${i + 1}`,
    codigo_produto: `COD-${i + 1}`,
    status: i < 2 ? "ativo" : "inativo",
  }));
  const ids = new Set([1, 2, 3]);
  assert.deepEqual(planejarStatus(produtos, ids, "ativo"), {
    ids: [3],
    jaNoStatus: 2,
  });
  assert.deepEqual(planejarStatus(produtos, new Set([1, 2]), "ativo"), {
    ids: [],
    jaNoStatus: 2,
  });
});
