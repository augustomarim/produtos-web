import type { Produto } from "../types/produto";
export const LIMITE_SELECAO = 100;
export function restringirSelecao(
  ids: ReadonlySet<number>,
  visiveis: Produto[],
) {
  const permitidos = new Set(visiveis.map((p) => p.id));
  return new Set([...ids].filter((id) => permitidos.has(id)));
}
export function selecionarProduto(
  ids: ReadonlySet<number>,
  id: number,
  marcar: boolean,
) {
  const novos = new Set(ids);
  if (marcar) novos.add(id);
  else novos.delete(id);
  if (novos.size > LIMITE_SELECAO)
    throw new Error("Selecione no máximo 100 produtos por vez.");
  return novos;
}
export function selecionarVisiveis(visiveis: Produto[], marcar: boolean) {
  if (!marcar) return new Set<number>();
  const ids = new Set(visiveis.map((p) => p.id));
  if (ids.size > LIMITE_SELECAO)
    throw new Error(
      "Há mais de 100 produtos visíveis. Refine a busca ou selecione até 100 individualmente.",
    );
  return ids;
}
