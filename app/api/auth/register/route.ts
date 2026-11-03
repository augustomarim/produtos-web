import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const apiUrl = process.env.API_URL;

  if (!apiUrl) {
    return NextResponse.json(
      { error: "API_URL não configurada." },
      { status: 500 },
    );
  }

  let dados: unknown;

  try {
    dados = await request.json();
  } catch {
    return NextResponse.json(
      { error: "JSON inválido." },
      { status: 400 },
    );
  }

  try {
    const resposta = await fetch(`${apiUrl}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(dados),
      cache: "no-store",
      signal: AbortSignal.timeout(60_000),
    });

    const resultado = await resposta.json();

    return NextResponse.json(resultado, {
      status: resposta.status,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Não foi possível cadastrar o usuário." },
      { status: 502 },
    );
  }
}