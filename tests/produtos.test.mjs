import { test } from "node:test";
import assert from "node:assert/strict";
import { ordenarProdutos, formatarData } from "../src/lib/produtos.ts";
const produto = (id, createdAt, updatedAt) => ({
  id,
  codigo_produto: `P-${id}`,
  descricao_produto: "Produto",
  status: "ativo",
  foto_produto: null,
  foto_miniatura: null,
  createdAt,
  updatedAt,
});
test("última alteração primeiro, datas desconhecidas no final e desempate por ID", () => {
  const lista = [
    produto(1, null, null),
    produto(2, "2026-01-01", "2026-02-01"),
    produto(3, "2026-03-01", "2026-03-01"),
    produto(4, null, null),
  ];
  assert.deepEqual(
    ordenarProdutos(lista).map((p) => p.id),
    [3, 2, 4, 1],
  );
  assert.deepEqual(
    lista.map((p) => p.id),
    [1, 2, 3, 4],
  );
  lista[0].updatedAt = "2026-04-01";
  assert.deepEqual(
    ordenarProdutos(lista).map((p) => p.id),
    [1, 3, 2, 4],
  );
  assert.deepEqual(
    ordenarProdutos(lista, "criados").map((p) => p.id),
    [3, 2, 4, 1],
  );
});
test("datas ausentes ou inválidas não exibem datas inventadas", () => {
  assert.equal(formatarData(null), "Não registrada");
  assert.equal(formatarData("invalida"), "Não registrada");
  assert.match(formatarData("2026-11-03T12:00:00Z"), /2026/);
});
