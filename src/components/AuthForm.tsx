"use client";
import { type FormEvent, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SlowFeedback } from "./Experience";
import { useFeedback } from "./Feedback";
import { limparPreferenciasCatalogo } from "../lib/catalogo";
import {
  guardarAccessToken,
  limparSessao,
  avisarMudancaSessao,
  comBloqueioSessao,
} from "../lib/sessao";
import { Header, Icon, Spinner } from "./ui";
export default function AuthForm({ cadastro = false }: { cadastro?: boolean }) {
  const router = useRouter();
  const { notify } = useFeedback();
  const formRef = useRef<HTMLFormElement>(null);
  const [campos, setCampos] = useState<Record<string, string>>({});
  function mostrarCampos(erros: Record<string, string>) {
    setCampos(erros);
    setErro("Revise os campos destacados.");
    requestAnimationFrame(() =>
      formRef.current
        ?.querySelector<HTMLElement>(`[name="${Object.keys(erros)[0]}"]`)
        ?.focus(),
    );
  }
  function erroCampo(nome: string) {
    return campos[nome] ? (
      <span className="field-error" id={`erro-${nome}`}>
        {campos[nome]}
      </span>
    ) : null;
  }
  function atributos(nome: string) {
    return {
      "aria-invalid": !!campos[nome],
      "aria-describedby": campos[nome] ? `erro-${nome}` : undefined,
    };
  }
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const nome = String(form.get("nome") || "").trim();
    const email = String(form.get("email") || "").trim();
    const senha = String(form.get("senha") || "");
    const invalidos: Record<string, string> = {};
    if (cadastro && !nome) invalidos.nome = "Informe seu nome.";
    const emailInput = formRef.current?.elements.namedItem(
      "email",
    ) as HTMLInputElement;
    if (!email || !emailInput.validity.valid)
      invalidos.email = "Informe um email válido.";
    if (!senha || (cadastro && senha.length < 6))
      invalidos.senha = cadastro
        ? "Use pelo menos 6 caracteres."
        : "Informe sua senha.";
    if (cadastro && senha !== form.get("confirmacao"))
      invalidos.confirmacao = "As senhas não são iguais.";
    setCampos(invalidos);
    if (Object.keys(invalidos).length) {
      mostrarCampos(invalidos);
      return;
    }
    setCarregando(true);
    setErro("");
    try {
      const resposta = await comBloqueioSessao(() =>
        fetch(cadastro ? "/api/auth/register" : "/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nome, email, senha }),
        }),
      );
      const dados = await resposta.json();
      if (!resposta.ok) {
        const invalidos: Record<string, string> = {};
        for (const detalhe of dados.details || [])
          if (["nome", "email", "senha"].includes(detalhe.field))
            invalidos[detalhe.field] = detalhe.message;
        if (cadastro && resposta.status === 409)
          invalidos.email =
            "Este email já está cadastrado. Entre na sua conta.";
        if (Object.keys(invalidos).length) {
          mostrarCampos(invalidos);
          setCarregando(false);
          return;
        }
        throw new Error(
          dados.details
            ?.map((d: { message: string }) => d.message)
            .join(". ") ||
            dados.error ||
            "Não foi possível continuar.",
        );
      }
      if (!cadastro) {
        if (typeof dados.token !== "string")
          throw new Error("Resposta de autenticação inválida.");
        limparSessao();
        limparPreferenciasCatalogo();
        guardarAccessToken(dados.token);
        avisarMudancaSessao();
        window.location.replace("/produtos");
        return;
      }
      if (cadastro)
        notify("Conta criada com sucesso. Entre com seu email e senha.");
      router.replace("/login");
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
          <form
            ref={formRef}
            noValidate
            onSubmit={enviar}
            onChange={(e) => {
              const nome =
                e.target instanceof HTMLInputElement ? e.target.name : "";
              setCampos((c) => {
                const novo = { ...c };
                delete novo[nome];
                return novo;
              });
            }}
          >
            {cadastro && (
              <label className="form-field">
                <span>Nome</span>
                <input
                  className="form-input"
                  name="nome"
                  aria-label="Nome"
                  {...atributos("nome")}
                  autoComplete="name"
                  required
                  disabled={carregando}
                />
                {erroCampo("nome")}
              </label>
            )}
            <label className="form-field">
              <span>Email</span>
              <input
                className="form-input"
                name="email"
                aria-label="Email"
                {...atributos("email")}
                type="email"
                autoComplete="email"
                required
                disabled={carregando}
              />
              {erroCampo("email")}
            </label>
            <label className="form-field">
              <span>Senha</span>
              <input
                className="form-input"
                name="senha"
                aria-label="Senha"
                {...atributos("senha")}
                type="password"
                autoComplete={cadastro ? "new-password" : "current-password"}
                minLength={cadastro ? 6 : 1}
                required
                disabled={carregando}
              />
              {erroCampo("senha")}
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
                  aria-label="Confirmar senha"
                  {...atributos("confirmacao")}
                  type="password"
                  autoComplete="new-password"
                  minLength={6}
                  required
                  disabled={carregando}
                />
                {erroCampo("confirmacao")}
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
            <SlowFeedback
              active={carregando}
              message={
                cadastro ? "Criando sua conta…" : "Entrando na sua conta…"
              }
            />
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
