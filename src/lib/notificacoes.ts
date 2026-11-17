export type Notificacao = {
  id: number;
  produtoId: number;
  codigo: string;
  descricao: string;
  acao: "criado" | "editado" | "removido";
  campos: string[];
  origem: "web" | "mobile" | "api";
  revisao: number;
  ocorreuEm: string;
  lida: boolean;
};
export type ListaNotificacoes = {
  notificacoes: Notificacao[];
  naoLidas: number;
  total: number;
  pagina: number;
  paginas: number;
};
export function tituloNotificacao(n: Notificacao) {
  if (n.acao === "criado") return "Produto criado";
  if (n.acao === "removido") return "Produto removido";
  return "Produto editado";
}
export function detalhesNotificacao(n: Notificacao) {
  const rotulos: Record<string, string> = {
    codigo: "código",
    descricao: "descrição",
    imagem: "imagem",
    ativado: "ativado",
    inativado: "inativado",
  };
  if (n.acao !== "editado") return "";
  return `Alterações: ${n.campos
    .map((c) => rotulos[c])
    .filter(Boolean)
    .join(", ")}.`;
}
export function origemNotificacao(n: Notificacao) {
  return n.origem === "web"
    ? "Pelo site"
    : n.origem === "mobile"
      ? "Pelo aplicativo"
      : "Pela API";
}
export function dataNotificacao(data: string) {
  return new Date(data).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
