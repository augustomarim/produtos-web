import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const apiUrl = process.env.API_URL;
  const authorization = request.headers.get("authorization");

  if (!apiUrl) {
    return NextResponse.json(
      { error: "API_URL não configurada." },
      { status: 500 },
    );
  }

  if (!authorization?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Entre na sua conta para continuar." },
      { status: 401 },
    );
  }

  try {
    const resposta = await fetch(`${apiUrl}/produtos`, {
      headers: {
        Authorization: authorization,
      },
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
      { error: "Não foi possível consultar os produtos." },
      { status: 502 },
    );
  }
}

export async function POST(request: NextRequest) {
  const apiUrl = process.env.API_URL;
  const authorization = request.headers.get("authorization");

  if (!apiUrl) {
    return NextResponse.json(
      { error: "API_URL não configurada." },
      { status: 500 },
    );
  }

  if (!authorization?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Entre na sua conta para continuar." },
      { status: 401 },
    );
  }

  let formulario: FormData;

  try {
    formulario = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Formulário inválido." },
      { status: 400 },
    );
  }

  try {
    const resposta = await fetch(`${apiUrl}/produtos`, {
      method: "POST",
      headers: {
        Authorization: authorization,
      },
      body: formulario,
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
      { error: "Não foi possível criar o produto." },
      { status: 502 },
    );
  }
}