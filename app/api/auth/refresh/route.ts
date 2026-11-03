import { NextRequest, NextResponse } from "next/server";

function limparCookie(response: NextResponse) {
  response.cookies.set("refreshToken", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/auth",
    maxAge: 0,
  });

  return response;
}

export async function POST(request: NextRequest) {
  const apiUrl = process.env.API_URL;

  if (!apiUrl) {
    return NextResponse.json(
      { error: "API_URL não configurada no servidor." },
      { status: 500 },
    );
  }

  const refreshToken = request.cookies.get("refreshToken")?.value;

  if (!refreshToken) {
    return NextResponse.json(
      { error: "Sessão não encontrada. Entre novamente." },
      { status: 401 },
    );
  }

  try {
    const resposta = await fetch(`${apiUrl}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
      signal: AbortSignal.timeout(60_000),
    });

    if (resposta.status === 401) {
      return limparCookie(
        NextResponse.json(
          { error: "Sessão expirada. Entre novamente." },
          { status: 401 },
        ),
      );
    }

    if (!resposta.ok) {
      return NextResponse.json(
        { error: "Não foi possível renovar a sessão." },
        { status: 502 },
      );
    }

    const resultado = await resposta.json();

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
      { token: resultado.token },
      { headers: { "Cache-Control": "no-store" } },
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