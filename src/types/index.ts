export type StatusProduto = "ativo" | "inativo";

export type Produto = {
  id: number;
  codigo_produto: string;
  descricao_produto: string;
  status: StatusProduto;
  foto_produto: string | null;
  foto_miniatura: string | null;
};

export type Usuario = {
  id: number;
  nome: string;
  email: string;
};

export type LoginResposta = {
    token: string;
    usuario: Usuario;
};