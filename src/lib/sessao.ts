let renovacaoEmAndamento: Promise<string> | null = null;

export class SessaoExpiradaError extends Error {}

export function renovarSessao(): Promise<string> {
  if (renovacaoEmAndamento) {
    return renovacaoEmAndamento;
  }

  renovacaoEmAndamento = executarRenovacao().finally(() => {
    renovacaoEmAndamento = null;
  });

  return renovacaoEmAndamento;
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