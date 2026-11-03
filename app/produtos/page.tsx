"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import type { Produto } from "../../src/types/produto";
import {
  renovarSessao,
  SessaoExpiradaError,
} from "../../src/lib/sessao";

export default function ProdutosPage() {
  const router = useRouter();

  const [excluindo, setExcluindo] = useState(false);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [tentativa, setTentativa] = useState(0);
  const [saindo, setSaindo] = useState(false);
  const [alterandoStatus, setAlterandoStatus] = useState(false);

  const ocupado =
  carregando || saindo || alterandoStatus || excluindo;

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      try {
        const token = await renovarSessao();

        if (!ativo) return;

        const resposta = await fetch("/api/produtos", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        });

        if (resposta.status === 401) {
          throw new SessaoExpiradaError("Entre novamente.");
        }

        if (!resposta.ok) {
          throw new Error("Não foi possível carregar os produtos.");
        }

        const dados: Produto[] = await resposta.json();

        if (ativo) {
          setProdutos(dados);
        }
      } catch (error) {
        if (!ativo) return;

        if (error instanceof SessaoExpiradaError) {
          router.replace("/login");
          return;
        }

        setErro(
          error instanceof Error
            ? error.message
            : "Erro ao carregar os produtos.",
        );
      } finally {
        if (ativo) {
          setCarregando(false);
        }
      }
    }

    void carregar();

    return () => {
      ativo = false;
    };
  }, [router, tentativa]);

  function atualizar() {
    setErro("");
    setCarregando(true);
    setTentativa((valor) => valor + 1);
  }

  async function sair() {
    setSaindo(true);
    setErro("");

    try {
      const resposta = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (!resposta.ok) {
        throw new Error("Não foi possível sair. Tente novamente.");
      }

      router.replace("/login");
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro ao encerrar a sessão.",
      );

      setSaindo(false);
    }
  }

  async function alterarStatus(id: number) {
    setAlterandoStatus(true);
    setErro("");

    try {
      const token = await renovarSessao();

      const resposta = await fetch(`/api/produtos/${id}/status`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (resposta.status === 401) {
        throw new SessaoExpiradaError("Entre novamente.");
      }

      const resultado = await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          resultado.error || "Não foi possível alterar o status.",
        );
      }

      const atualizado: Produto = resultado;

      setProdutos((lista) =>
        lista.map((produto) =>
          produto.id === id ? atualizado : produto,
        ),
      );
    } catch (error) {
      if (error instanceof SessaoExpiradaError) {
        router.replace("/login");
        return;
      }

      setErro(
        error instanceof Error
          ? error.message
          : "Erro ao alterar o status.",
      );
    } finally {
      setAlterandoStatus(false);
    }
  }

    async function excluirProduto(produto: Produto) {
    const confirmou = window.confirm(
      `Excluir o produto "${produto.descricao_produto}"? Essa ação não pode ser desfeita.`,
    );

    if (!confirmou) return;

    setExcluindo(true);
    setErro("");

    try {
      const token = await renovarSessao();

      const resposta = await fetch(`/api/produtos/${produto.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (resposta.status === 401) {
        throw new SessaoExpiradaError("Entre novamente.");
      }

      if (resposta.status !== 204) {
        const resultado = await resposta.json();

        throw new Error(
          resultado.error || "Não foi possível excluir o produto.",
        );
      }

      setProdutos((lista) =>
        lista.filter((item) => item.id !== produto.id),
      );
    } catch (error) {
      if (error instanceof SessaoExpiradaError) {
        router.replace("/login");
        return;
      }

      setErro(
        error instanceof Error
          ? error.message
          : "Erro ao excluir o produto.",
      );
    } finally {
      setExcluindo(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
      <section className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl font-bold">Produtos</h1>

          <div className="flex flex-wrap gap-3">
            {!ocupado && (
              <Link
                href="/produtos/novo"
                className="rounded bg-emerald-700 px-4 py-2 text-white"
              >
                Novo produto
              </Link>
            )}

            <button
              onClick={atualizar}
              disabled={ocupado}
              className="rounded bg-emerald-700 px-4 py-2 text-white disabled:opacity-50"
            >
              Atualizar
            </button>

            <button
              onClick={sair}
              disabled={ocupado}
              className="rounded bg-slate-700 px-4 py-2 text-white disabled:opacity-50"
            >
              {saindo ? "Saindo…" : "Sair"}
            </button>
          </div>
        </div>

        {erro && (
          <p
            role="alert"
            className="mb-4 rounded bg-red-100 p-4 text-red-800"
          >
            {erro}
          </p>
        )}

        {alterandoStatus && (
          <p role="status" className="mb-4 text-slate-600">
            Alterando status…
          </p>
        )}

        {carregando ? (
          <p role="status">Carregando produtos…</p>
        ) : produtos.length === 0 ? (
          !erro && <p>Nenhum produto cadastrado.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg bg-white shadow">
            <table className="w-full text-left">
              <thead className="bg-slate-200">
                <tr>
                  <th scope="col" className="p-4">
                    Foto
                  </th>
                  <th scope="col" className="p-4">
                    Código
                  </th>
                  <th scope="col" className="p-4">
                    Descrição
                  </th>
                  <th scope="col" className="p-4">
                    Status
                  </th>
                  <th scope="col" className="p-4">
                    Ações
                  </th>
                </tr>
              </thead>

              <tbody>
                {produtos.map((produto) => {
                  const foto =
                    produto.foto_miniatura || produto.foto_produto;

                  return (
                    <tr
                      key={produto.id}
                      className={
                        produto.status === "ativo"
                          ? "border-t border-slate-200 bg-emerald-50"
                          : "border-t border-slate-200"
                      }
                    >
                      <td className="p-4">
                        {foto ? (
                          <img
                            src={foto}
                            alt={produto.descricao_produto}
                            width={64}
                            height={64}
                            loading="lazy"
                            className="h-16 w-16 rounded object-cover"
                          />
                        ) : (
                          <span
                            role="img"
                            aria-label="Produto sem foto"
                            className="flex h-16 w-16 items-center justify-center rounded bg-slate-100 text-3xl text-slate-500"
                          >
                            ◇
                          </span>
                        )}
                      </td>

                      <td className="p-4">
                        {produto.codigo_produto}
                      </td>

                      <td className="p-4">
                        {produto.descricao_produto}
                      </td>

                      <td className="p-4">
                        <span
                          className={
                            produto.status === "ativo"
                              ? "rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-800"
                              : "rounded-full bg-slate-200 px-3 py-1 text-sm font-medium text-slate-700"
                          }
                        >
                          {produto.status === "ativo"
                            ? "Ativo"
                            : "Inativo"}
                        </span>
                      </td>

                      <td className="p-4">
                        <div className="flex gap-2">
                          {!ocupado && (
                            <Link
                              href={`/produtos/${produto.id}/editar`}
                              className="rounded bg-blue-700 px-3 py-2 text-sm text-white"
                            >
                              Editar
                            </Link>
                          )}
                          <button
                            onClick={() => alterarStatus(produto.id)}
                            disabled={ocupado}
                            aria-label={`${
                              produto.status === "ativo" ? "Inativar" : "Ativar"
                            } ${produto.descricao_produto}`}
                            className="rounded bg-slate-700 px-3 py-2 text-sm text-white disabled:opacity-50"
                          >
                            {produto.status === "ativo" ? "Inativar" : "Ativar"}
                          </button>

                          <button
                            onClick={() => excluirProduto(produto)}
                            disabled={ocupado}
                            aria-label={`Excluir ${produto.descricao_produto}`}
                            className="rounded bg-red-700 px-3 py-2 text-sm text-white disabled:opacity-50"
                          >
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}