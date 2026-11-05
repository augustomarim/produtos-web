import { test } from "node:test";
import assert from "node:assert/strict";
import {
  restringirSelecao,
  selecionarProduto,
  selecionarVisiveis,
} from "../src/lib/selecao.ts";
const produtos = (ids) => ids.map((id) => ({ id }));
test("selecionar todos respeita visíveis e desmarcar limpa sem restaurar ocultos", () => {
  assert.deepEqual([...selecionarVisiveis(produtos([2, 3]), true)], [2, 3]);
  assert.deepEqual(
    [...restringirSelecao(new Set([1, 2, 3]), produtos([2, 3]))],
    [2, 3],
  );
  assert.equal(selecionarVisiveis(produtos([2, 3]), false).size, 0);
});
test("seleção não duplica, não altera o conjunto original e limita a 100", () => {
  const original = new Set([1]);
  assert.equal(selecionarProduto(original, 1, true).size, 1);
  assert.equal(selecionarProduto(original, 1, false).size, 0);
  assert.equal(original.size, 1);
  const cem = selecionarVisiveis(
    produtos(Array.from({ length: 100 }, (_, i) => i + 1)),
    true,
  );
  assert.equal(cem.size, 100);
  assert.throws(() => selecionarProduto(cem, 101, true), /100/);
  assert.throws(
    () =>
      selecionarVisiveis(
        produtos(Array.from({ length: 101 }, (_, i) => i + 1)),
        true,
      ),
    /100/,
  );
});
