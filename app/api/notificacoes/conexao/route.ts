import { NextRequest, NextResponse } from "next/server";
export async function GET(request: NextRequest) {
  const url = process.env.API_URL?.replace(/\/+$/, "");
  const authorization = request.headers.get("authorization");
  if (!url)
    return NextResponse.json(
      { error: "API_URL não configurada." },
      { status: 500 },
    );
  if (!authorization?.startsWith("Bearer "))
    return NextResponse.json({ error: "Entre na sua conta." }, { status: 401 });
  try {
    const r = await fetch(`${url}/notificacoes/conexao`, {
      headers: { Authorization: authorization, "X-App-Origin": "web" },
      cache: "no-store",
      signal: AbortSignal.timeout(60000),
    });
    const dados = await r.json();
    return NextResponse.json(r.ok ? { ...dados, url } : dados, {
      status: r.status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "Não foi possível conectar em tempo real." },
      { status: 502 },
    );
  }
}
