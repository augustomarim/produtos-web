"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function CadastroPage() {
  const router = useRouter();

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function cadastrar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro("");

    if (!nome.trim() || !email.trim()) {
      setErro("Nome e email são obrigatórios.");
      return;
    }

    if (senha.length < 6) {
      setErro("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    if (senha !== confirmacao) {
      setErro("As senhas não são iguais.");
      return;
    }

    setCarregando(true);

    try {
      const resposta = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nome: nome.trim(),
          email: email.trim(),
          senha,
        }),
      });

      const resultado = await resposta.json();

      if (!resposta.ok) {
        const detalhes = resultado.details
          ?.map((item: { message: string }) => item.message)
          .join(". ");

        throw new Error(
          detalhes ||
            resultado.error ||
            "Não foi possível criar sua conta.",
        );
      }

      router.replace("/login");
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro ao criar sua conta.",
      );
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8 text-slate-900">
      <section className="w-full max-w-md rounded-xl bg-white p-8 shadow">
        <h1 className="text-2xl font-bold">Criar conta</h1>

        <p className="mt-2 text-slate-600">
          Cadastre-se para gerenciar os produtos.
        </p>

        <form onSubmit={cadastrar} className="mt-6 space-y-4">
          <div>
            <label htmlFor="nome" className="block font-medium">
              Nome
            </label>

            <input
              id="nome"
              type="text"
              autoComplete="name"
              value={nome}
              onChange={(event) => setNome(event.target.value)}
              required
              disabled={carregando}
              className="mt-1 w-full rounded border border-slate-300 p-3"
            />
          </div>

          <div>
            <label htmlFor="email" className="block font-medium">
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
              className="mt-1 w-full rounded border border-slate-300 p-3"
            />
          </div>

          <div>
            <label htmlFor="senha" className="block font-medium">
              Senha
            </label>

            <input
              id="senha"
              type="password"
              autoComplete="new-password"
              value={senha}
              onChange={(event) => setSenha(event.target.value)}
              minLength={6}
              required
              disabled={carregando}
              className="mt-1 w-full rounded border border-slate-300 p-3"
            />

            <p className="mt-1 text-sm text-slate-600">
              Use pelo menos 6 caracteres.
            </p>
          </div>

          <div>
            <label
              htmlFor="confirmacao"
              className="block font-medium"
            >
              Confirmar senha
            </label>

            <input
              id="confirmacao"
              type="password"
              autoComplete="new-password"
              value={confirmacao}
              onChange={(event) =>
                setConfirmacao(event.target.value)
              }
              minLength={6}
              required
              disabled={carregando}
              className="mt-1 w-full rounded border border-slate-300 p-3"
            />
          </div>

          {erro && (
            <p role="alert" className="text-sm text-red-700">
              {erro}
            </p>
          )}

          <button
            type="submit"
            disabled={carregando}
            className="w-full rounded bg-emerald-700 p-3 font-semibold text-white disabled:opacity-50"
          >
            {carregando ? "Criando conta…" : "Criar conta"}
          </button>

          {!carregando && (
            <Link
              href="/login"
              className="block text-center text-emerald-700"
            >
              Já tenho conta. Entrar
            </Link>
          )}
        </form>
      </section>
    </main>
  );
}