"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function entrar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErro("");
    setCarregando(true);

    try {
      const resposta = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          senha,
        }),
      });

      const resultado = await resposta.json();

      if (!resposta.ok) {
        setErro(resultado.error || "Não foi possível entrar.");
        return;
      }

      // O refresh token é guardado pelo servidor no cookie HttpOnly.
      // A próxima tela obterá um access token pela rota de refresh.
      router.replace("/produtos");
    } catch {
      setErro("Não foi possível conectar. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  return (
  <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8">
    <section className="w-full max-w-md rounded-xl bg-white p-8 shadow">
      <h1 className="text-2xl font-bold text-slate-900">
        Entrar
      </h1>

      <p className="mt-2 text-slate-600">
        Acesse sua conta para gerenciar os produtos.
      </p>

      <form onSubmit={entrar} className="mt-6 space-y-4">
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-slate-700"
          >
            Email
          </label>

          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            disabled={carregando}
            className="mt-1 w-full rounded border border-slate-300 p-3 text-slate-900"
          />
        </div>

        <div>
          <label
            htmlFor="senha"
            className="block text-sm font-medium text-slate-700"
          >
            Senha
          </label>

          <input
            id="senha"
            type="password"
            autoComplete="current-password"
            value={senha}
            onChange={(event) => setSenha(event.target.value)}
            required
            disabled={carregando}
            className="mt-1 w-full rounded border border-slate-300 p-3 text-slate-900"
          />
        </div>

        {erro && (
          <p role="alert" className="text-sm text-red-600">
            {erro}
          </p>
        )}

        <button
          type="submit"
          disabled={carregando}
          className="w-full rounded bg-emerald-700 p-3 font-semibold text-white disabled:opacity-50"
        >
          {carregando ? "Entrando…" : "Entrar"}
        </button>
      </form>

      {!carregando && (
        <p className="mt-6 text-center text-sm text-slate-600">
          Ainda não tem conta?{" "}
          <Link
            href="/cadastro"
            className="font-semibold text-emerald-700 hover:underline"
          >
            Criar conta
          </Link>
        </p>
      )}
    </section>
  </main>
  );
}