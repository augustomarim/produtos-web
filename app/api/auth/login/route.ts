import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const apiUrl = process.env.API_URL;

  if (!apiUrl) {
    return NextResponse.json(
      { error: "API_URL não configurada no servidor." },
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
    const resposta = await fetch(`${apiUrl}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(dados),
      cache: "no-store",
      signal: AbortSignal.timeout(60_000),
    });

    const resultado = await resposta.json();

    if (!resposta.ok) {
      return NextResponse.json(resultado, {
        status: resposta.status,
      });
    }

    if (
      typeof resultado.token !== "string" ||
      typeof resultado.refreshToken !== "string"
    ) {
      return NextResponse.json(
        { error: "Resposta de autenticação inválida." },
        { status: 502 },
      );
    }

    const response = NextResponse.json(
      {
        token: resultado.token,
        usuario: resultado.usuario,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );

    response.cookies.set(
      "refreshToken",
      resultado.refreshToken,
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/api/auth",
        maxAge: 7 * 24 * 60 * 60,
      },
    );

    return response;
  } catch {
    return NextResponse.json(
      { error: "Não foi possível conectar ao backend." },
      { status: 502 },
    );
  }
}