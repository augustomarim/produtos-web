export interface Produto {
  id: number;
  codigo_produto: string;
  descricao_produto: string;
  status: "ativo" | "inativo";
  foto_produto: string | null;
  foto_miniatura: string | null;
  // Optional for compatibility while the backend migration is being deployed.
  createdAt?: string | null;
  updatedAt?: string | null;
}
