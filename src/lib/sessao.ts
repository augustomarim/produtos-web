let renovacaoEmAndamento: Promise<string> | null = null;
let accessToken: string | null = null;
let expiraEm = 0;
let versaoSessao = 0;

export class SessaoExpiradaError extends Error {}

export function guardarAccessToken(token: string) {
  accessToken = token;
  try {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const exp: unknown = JSON.parse(atob(payload)).exp;
    expiraEm = typeof exp === "number" ? exp * 1000 : 0;
  } catch {
    // Never persist tokens; an unknown expiry simply prevents caching.
    expiraEm = 0;
  }
}

export function limparSessao() {
  versaoSessao++;
  accessToken = null;
  expiraEm = 0;
}

export function invalidarAccessToken(tokenUsado: string) {
  // A late 401 from an old request must not discard a newer token.
  if (accessToken === tokenUsado) {
    accessToken = null;
    expiraEm = 0;
  }
}

export function renovarSessao(): Promise<string> {
  if (accessToken && expiraEm > Date.now() + 30_000) {
    return Promise.resolve(accessToken);
  }
  if (renovacaoEmAndamento) return renovacaoEmAndamento;

  const versao = versaoSessao;
  const renovar = () => executarRenovacao(versao);
  const operacao: Promise<string> =
    typeof navigator !== "undefined" && navigator.locks
      ? Promise.resolve(navigator.locks.request("produtos:refresh", renovar))
      : renovar();

  const pendente = operacao.finally(() => {
    if (renovacaoEmAndamento === pendente) renovacaoEmAndamento = null;
  });
  renovacaoEmAndamento = pendente;
  return pendente;
}

async function executarRenovacao(versao: number): Promise<string> {
  if (versao !== versaoSessao)
    throw new SessaoExpiradaError("Entre novamente.");
  const resposta = await fetch("/api/auth/refresh", {
    method: "POST",
    cache: "no-store",
  });
  if (versao !== versaoSessao)
    throw new SessaoExpiradaError("Entre novamente.");
  if (resposta.status === 401) {
    limparSessao();
    throw new SessaoExpiradaError("Sua sessão expirou. Entre novamente.");
  }
  if (!resposta.ok)
    throw new Error("Não foi possível renovar sua sessão. Tente novamente.");
  const dados = await resposta.json();
  if (versao !== versaoSessao)
    throw new SessaoExpiradaError("Entre novamente.");
  if (typeof dados.token !== "string")
    throw new Error("Resposta de autenticação inválida.");
  guardarAccessToken(dados.token);
  return dados.token;
}
