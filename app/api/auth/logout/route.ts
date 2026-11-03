import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get("refreshToken")?.value;

  if (refreshToken) {
    const apiUrl = process.env.API_URL;

    if (!apiUrl) {
      return NextResponse.json(
        { error: "API_URL não configurada no servidor." },
        { status: 500 },
      );
    }

    try {
      const resposta = await fetch(`${apiUrl}/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken }),
        cache: "no-store",
        signal: AbortSignal.timeout(60_000),
      });

      if (!resposta.ok) {
        return NextResponse.json(
          { error: "Não foi possível encerrar a sessão. Tente novamente." },
          { status: 502 },
        );
      }
    } catch {
      return NextResponse.json(
        { error: "Não foi possível conectar ao backend. Tente novamente." },
        { status: 502 },
      );
    }
  }

  const response = new NextResponse(null, {
    status: 204,
    headers: {
      "Cache-Control": "no-store",
    },
  });

  response.cookies.set("refreshToken", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/auth",
    maxAge: 0,
  });

  return response;
}