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

export function planejarStatus(
  produtos: Produto[],
  ids: ReadonlySet<number>,
  status: "ativo" | "inativo",
) {
  const selecionados = produtos.filter((p) => ids.has(p.id));
  return {
    ids: selecionados.filter((p) => p.status !== status).map((p) => p.id),
    jaNoStatus: selecionados.filter((p) => p.status === status).length,
  };
}
export function confirmarExclusao(produtos: Produto[]) {
  const nomes = produtos
    .slice(0, 5)
    .map((p) => `• ${p.descricao_produto} (${p.codigo_produto})`)
    .join("\n");
  const restantes = produtos.length - 5;
  return `Excluir ${produtos.length} ${produtos.length === 1 ? "produto selecionado" : "produtos selecionados"}?\n\n${nomes}${restantes > 0 ? `\n… e mais ${restantes} ${restantes === 1 ? "produto" : "produtos"}.` : ""}\n\nAs fotos associadas também serão removidas. Essa ação não pode ser desfeita.`;
}
