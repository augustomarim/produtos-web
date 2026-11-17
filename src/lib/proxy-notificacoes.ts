import { NextRequest, NextResponse } from "next/server";
export async function encaminharNotificacoes(
  request: NextRequest,
  method: "GET" | "PATCH",
) {
  const apiUrl = process.env.API_URL?.replace(/\/+$/, "");
  if (!apiUrl)
    return NextResponse.json(
      { error: "API_URL não configurada." },
      { status: 500 },
    );
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer "))
    return NextResponse.json({ error: "Entre na sua conta." }, { status: 401 });
  let body: string | undefined;
  if (method === "PATCH") {
    try {
      body = JSON.stringify(await request.json());
    } catch {
      return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
    }
  }
  try {
    const resposta = await fetch(
      `${apiUrl}/notificacoes${method === "PATCH" ? "/lidas" : `?pagina=${encodeURIComponent(request.nextUrl.searchParams.get("pagina") || "1")}`}`,
      {
        method,
        headers: {
          Authorization: authorization,
          "X-App-Origin": "web",
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        body,
        cache: "no-store",
        signal: AbortSignal.timeout(60_000),
      },
    );
    return NextResponse.json(await resposta.json(), {
      status: resposta.status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "Não foi possível consultar as notificações. Tente novamente." },
      { status: 502 },
    );
  }
}
