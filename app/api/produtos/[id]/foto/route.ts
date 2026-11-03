import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const apiUrl = process.env.API_URL;
  const authorization = request.headers.get("authorization");
  const { id } = await context.params;

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

  const numeroId = Number(id);

  if (
    !Number.isInteger(numeroId) ||
    numeroId < 1 ||
    numeroId > 2147483647
  ) {
    return NextResponse.json(
      { error: "ID inválido." },
      { status: 400 },
    );
  }

  try {
    const resposta = await fetch(
      `${apiUrl}/produtos/${numeroId}/foto`,
      {
        method: "DELETE",
        headers: {
          Authorization: authorization,
        },
        cache: "no-store",
        signal: AbortSignal.timeout(60_000),
      },
    );

    const resultado = await resposta.json();

    return NextResponse.json(resultado, {
      status: resposta.status,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Não foi possível remover a foto." },
      { status: 502 },
    );
  }
}