import type { Produto } from "../types/produto";
export type Ordem = "atualizados" | "criados" | "codigo";
export function ordenarProdutos(
  produtos: Produto[],
  ordem: Ordem = "atualizados",
) {
  const valor = (data?: string | null) => {
    const n = data ? Date.parse(data) : NaN;
    return Number.isFinite(n) ? n : 0;
  };
  return [...produtos].sort((a, b) => {
    if (a.status !== b.status) return a.status === "ativo" ? -1 : 1;
    if (ordem === "codigo")
      return (
        a.codigo_produto.localeCompare(b.codigo_produto, "pt-BR", {
          numeric: true,
        }) || b.id - a.id
      );
    const campo = ordem === "criados" ? "createdAt" : "updatedAt";
    return valor(b[campo]) - valor(a[campo]) || b.id - a.id;
  });
}
export function formatarData(data?: string | null) {
  if (!data || !Number.isFinite(Date.parse(data))) return "Não registrada";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(data));
}

function normalizarNome(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

export function filtrarProdutos(
  produtos: Produto[],
  busca: string,
  status = "todos",
) {
  const termo = normalizarNome(busca);
  return produtos.filter(
    (p) =>
      (status === "todos" || p.status === status) &&
      normalizarNome(p.descricao_produto).includes(termo),
  );
}
