import type { Produto } from "../types/produto";
import { filtrarProdutos, ordenarProdutos, type Ordem } from "./produtos";
export interface PreferenciasCatalogo {
  busca: string;
  filtro: string;
  ordem: Ordem;
  pagina: number;
  limite: number;
}
export interface PaginaProdutos {
  produtos: Produto[];
  total: number;
  pagina: number;
  paginas: number;
  limite: number;
  resumo: { total: number; ativos: number; inativos: number };
}
export const CHAVE_CATALOGO = "produtos:preferencias-catalogo";
export const PADRAO_CATALOGO: PreferenciasCatalogo = {
  busca: "",
  filtro: "todos",
  ordem: "atualizados",
  pagina: 1,
  limite: 25,
};
export function validarPreferencias(valor: unknown): PreferenciasCatalogo {
  if (!valor || typeof valor !== "object") return { ...PADRAO_CATALOGO };
  const p = valor as Partial<PreferenciasCatalogo>;
  return {
    busca: typeof p.busca === "string" ? p.busca.slice(0, 120) : "",
    filtro: ["todos", "ativo", "inativo"].includes(p.filtro || "")
      ? p.filtro!
      : "todos",
    ordem: ["atualizados", "criados", "codigo"].includes(p.ordem || "")
      ? p.ordem!
      : "atualizados",
    pagina:
      Number.isInteger(p.pagina) && p.pagina! > 0 && p.pagina! <= 1000000
        ? p.pagina!
        : 1,
    limite: [10, 25, 50, 100].includes(p.limite || 0) ? p.limite! : 25,
  };
}
export function lerPreferenciasCatalogo() {
  try {
    return validarPreferencias(
      JSON.parse(sessionStorage.getItem(CHAVE_CATALOGO) || "null"),
    );
  } catch {
    return { ...PADRAO_CATALOGO };
  }
}
export function salvarPreferenciasCatalogo(p: PreferenciasCatalogo) {
  try {
    sessionStorage.setItem(CHAVE_CATALOGO, JSON.stringify(p));
  } catch {
    /* Storage may be unavailable; React still keeps the current view. */
  }
}
export function limparPreferenciasCatalogo() {
  try {
    sessionStorage.removeItem(CHAVE_CATALOGO);
  } catch {}
}
export function queryCatalogo(p: PreferenciasCatalogo) {
  return new URLSearchParams({
    pagina: String(p.pagina),
    limite: String(p.limite),
    busca: p.busca,
    status: p.filtro,
    ordem: p.ordem,
  }).toString();
}
export function adaptarPagina(
  resposta: PaginaProdutos | Produto[],
  p: PreferenciasCatalogo,
): PaginaProdutos {
  if (!Array.isArray(resposta)) return resposta;
  // Compatibility during rolling deploys. The new backend returns a page envelope.
  const lista = ordenarProdutos(
    filtrarProdutos(resposta, p.busca, p.filtro),
    p.ordem,
  );
  const paginas = Math.max(1, Math.ceil(lista.length / p.limite));
  const pagina = Math.min(p.pagina, paginas);
  const ativos = resposta.filter((item) => item.status === "ativo").length;
  return {
    produtos: lista.slice((pagina - 1) * p.limite, pagina * p.limite),
    total: lista.length,
    pagina,
    paginas,
    limite: p.limite,
    resumo: {
      total: resposta.length,
      ativos,
      inativos: resposta.length - ativos,
    },
  };
}
