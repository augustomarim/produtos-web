export interface Produto {
  id: number;
  codigo_produto: string;
  descricao_produto: string;
  status: "ativo" | "inativo";
  foto_produto: string | null;
  foto_miniatura: string | null;
}