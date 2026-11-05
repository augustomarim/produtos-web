import {
  invalidarAccessToken,
  obterVersaoSessao,
  SessaoAlteradaError,
  renovarSessao,
  SessaoExpiradaError,
} from "./sessao";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details: { field: string; message: string }[] = [],
  ) {
    super(message);
  }
}

export async function apiAutenticada<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let token = await renovarSessao();
  const versao = obterVersaoSessao();
  const verificar = () => {
    if (versao !== obterVersaoSessao())
      throw new SessaoAlteradaError(
        "A conta mudou. A resposta anterior foi descartada.",
      );
  };
  const enviar = () => {
    const headers = new Headers(options.headers);
    headers.set("Authorization", `Bearer ${token}`);
    return fetch(path, { ...options, headers, cache: "no-store" });
  };
  let resposta = await enviar();
  verificar();
  // Retry only an authentication rejection, never an unknown mutation failure.
  if (resposta.status === 401) {
    invalidarAccessToken(token);
    token = await renovarSessao();
    verificar();
    resposta = await enviar();
    verificar();
  }
  if (resposta.status === 401)
    throw new SessaoExpiradaError("Entre novamente.");
  if (resposta.status === 204) return undefined as T;
  const dados = await resposta.json().catch(() => ({}));
  verificar();
  if (!resposta.ok) {
    const detalhes = dados.details
      ?.map((d: { message: string }) => d.message)
      .join(". ");
    throw new ApiError(
      detalhes || dados.error || "Não foi possível concluir a operação.",
      resposta.status,
      Array.isArray(dados.details) ? dados.details : [],
    );
  }
  return dados as T;
}
