let renovacaoEmAndamento: Promise<string> | null = null;

export class SessaoExpiradaError extends Error {}

export function renovarSessao(): Promise<string> {
  if (renovacaoEmAndamento) {
    return renovacaoEmAndamento;
  }

  const renovar = () => executarRenovacao();

  // As abas compartilham o cookie, mas não a Promise deste módulo.
  // Web Locks evita que duas abas consumam o mesmo refresh token juntas.
  const operacao: Promise<string> =
    typeof navigator !== "undefined" && navigator.locks
      ? Promise.resolve(navigator.locks.request("produtos:refresh", renovar))
      : renovar();

  const pendente = operacao.finally(() => {
    renovacaoEmAndamento = null;
  });

  renovacaoEmAndamento = pendente;
  return pendente;
}

async function executarRenovacao(): Promise<string> {
  const resposta = await fetch("/api/auth/refresh", {
    method: "POST",
    cache: "no-store",
  });

  if (resposta.status === 401) {
    throw new SessaoExpiradaError("Entre novamente.");
  }

  if (!resposta.ok) {
    throw new Error("Não foi possível renovar sua sessão.");
  }

  const dados = await resposta.json();

  if (typeof dados.token !== "string") {
    throw new Error("Resposta de autenticação inválida.");
  }

  return dados.token;
}