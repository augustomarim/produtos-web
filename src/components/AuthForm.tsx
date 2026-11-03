"use client";
import { type FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { guardarAccessToken } from "../lib/sessao";
import { Header, Icon, Spinner } from "./ui";
export default function AuthForm({ cadastro = false }: { cadastro?: boolean }) {
  const router = useRouter();
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const nome = String(form.get("nome") || "").trim();
    const email = String(form.get("email") || "").trim();
    const senha = String(form.get("senha") || "");
    if (cadastro && senha !== form.get("confirmacao")) {
      setErro("As senhas não são iguais.");
      return;
    }
    if (!email || (cadastro && !nome)) {
      setErro("Preencha os campos obrigatórios.");
      return;
    }
    setCarregando(true);
    setErro("");
    try {
      const resposta = await fetch(
        cadastro ? "/api/auth/register" : "/api/auth/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nome, email, senha }),
        },
      );
      const dados = await resposta.json();
      if (!resposta.ok)
        throw new Error(
          dados.details
            ?.map((d: { message: string }) => d.message)
            .join(". ") ||
            dados.error ||
            "Não foi possível continuar.",
        );
      if (!cadastro) {
        if (typeof dados.token !== "string")
          throw new Error("Resposta de autenticação inválida.");
        guardarAccessToken(dados.token);
      }
      router.replace(cadastro ? "/login" : "/produtos");
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível conectar. Tente novamente.",
      );
      setCarregando(false);
    }
  }
  return (
    <>
      <Header />
      <main className="auth-main">
        <section className="auth-card">
          <span className="eyebrow">SEU CATÁLOGO, ORGANIZADO</span>
          <h1>{cadastro ? "Crie sua conta" : "Bem-vindo de volta"}</h1>
          <p className="muted">
            {cadastro
              ? "Comece a organizar seus produtos em um só lugar."
              : "Entre para acompanhar e gerenciar seus produtos."}
          </p>
          <form onSubmit={enviar}>
            {cadastro && (
              <label className="form-field">
                <span>Nome</span>
                <input
                  className="form-input"
                  name="nome"
                  autoComplete="name"
                  required
                  disabled={carregando}
                />
              </label>
            )}
            <label className="form-field">
              <span>Email</span>
              <input
                className="form-input"
                name="email"
                type="email"
                autoComplete="email"
                required
                disabled={carregando}
              />
            </label>
            <label className="form-field">
              <span>Senha</span>
              <input
                className="form-input"
                name="senha"
                type="password"
                autoComplete={cadastro ? "new-password" : "current-password"}
                minLength={cadastro ? 6 : 1}
                required
                disabled={carregando}
              />
              {cadastro && (
                <p className="form-hint">Pelo menos 6 caracteres.</p>
              )}
            </label>
            {cadastro && (
              <label className="form-field">
                <span>Confirmar senha</span>
                <input
                  className="form-input"
                  name="confirmacao"
                  type="password"
                  autoComplete="new-password"
                  minLength={6}
                  required
                  disabled={carregando}
                />
              </label>
            )}
            {erro && (
              <p
                role="alert"
                className="notice notice-error"
                style={{ marginBottom: 18 }}
              >
                {erro}
              </p>
            )}
            <button className="button button-primary" disabled={carregando}>
              {carregando ? (
                <Spinner />
              ) : (
                <Icon name={cadastro ? "plus" : "arrow"} />
              )}
              {carregando
                ? cadastro
                  ? "Criando conta…"
                  : "Entrando…"
                : cadastro
                  ? "Criar conta"
                  : "Entrar"}
            </button>
          </form>
          <p className="auth-switch">
            {cadastro ? "Já tem uma conta? " : "Ainda não tem conta? "}
            <Link
              href={cadastro ? "/login" : "/cadastro"}
              aria-disabled={carregando}
              onClick={(e) => {
                if (carregando) e.preventDefault();
              }}
            >
              {cadastro ? "Entrar" : "Criar conta"}
            </Link>
          </p>
        </section>
      </main>
    </>
  );
}
