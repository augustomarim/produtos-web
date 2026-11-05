import { NextRequest, NextResponse } from "next/server";
export async function encaminharLote(
  request: NextRequest,
  method: "PATCH" | "DELETE",
) {
  const apiUrl = process.env.API_URL;
  if (!apiUrl)
    return NextResponse.json(
      { error: "API_URL não configurada." },
      { status: 500 },
    );
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer "))
    return NextResponse.json(
      { error: "Entre na sua conta para continuar." },
      { status: 401 },
    );
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  try {
    const resposta = await fetch(
      `${apiUrl.replace(/\/$/, "")}/produtos${method === "PATCH" ? "/status" : ""}`,
      {
        method,
        headers: {
          Authorization: authorization,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        cache: "no-store",
        signal: AbortSignal.timeout(60_000),
      },
    );
    const dados = await resposta.json();
    return NextResponse.json(dados, {
      status: resposta.status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "Não foi possível confirmar a ação em lote. Atualize a lista antes de tentar novamente.",
      },
      { status: 502 },
    );
  }
}
