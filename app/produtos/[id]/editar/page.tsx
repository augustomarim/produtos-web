"use client";

/* eslint-disable @next/next/no-img-element */

import {
  Suspense,
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import type { Produto } from "../../../../src/types/produto";
import {
  renovarSessao,
  SessaoExpiradaError,
} from "../../../../src/lib/sessao";

export default function EditarProdutoPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
          <p role="status">Carregando formulário…</p>
        </main>
      }
    >
      <FormularioEditarProduto />
    </Suspense>
  );
}

function FormularioEditarProduto() {
  const { id } = useParams<{ id: string }>();

  return <EditorProduto key={id} id={id} />;
}

function EditorProduto({ id }: { id: string }) {
  const router = useRouter();

  const [codigo, setCodigo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [status, setStatus] = useState<"ativo" | "inativo">("ativo");

  const [fotoAtual, setFotoAtual] = useState<string | null>(null);
  const [foto, setFoto] = useState<File | null>(null);
  const [preview, setPreview] = useState("");

  const [carregando, setCarregando] = useState(true);
  const [carregado, setCarregado] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [removendoFoto, setRemovendoFoto] = useState(false);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [tentativa, setTentativa] = useState(0);

  const previewUrl = useRef("");

  const ocupado = salvando || removendoFoto;
  const imagemExibida = preview || fotoAtual;

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      try {
        const token = await renovarSessao();

        if (!ativo) return;

        const resposta = await fetch(`/api/produtos/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        });

        if (resposta.status === 401) {
          throw new SessaoExpiradaError("Entre novamente.");
        }

        const resultado = await resposta.json();

        if (!resposta.ok) {
          throw new Error(
            resultado.error || "Não foi possível buscar o produto.",
          );
        }

        const produto: Produto = resultado;

        if (ativo) {
          setCodigo(produto.codigo_produto);
          setDescricao(produto.descricao_produto);
          setStatus(produto.status);
          setFotoAtual(produto.foto_produto);
          setCarregado(true);
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
            : "Erro ao carregar o produto.",
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
  }, [id, router, tentativa]);

  useEffect(() => {
    return () => {
      if (previewUrl.current) {
        URL.revokeObjectURL(previewUrl.current);
      }
    };
  }, []);

  function tentarNovamente() {
    setErro("");
    setCarregando(true);
    setTentativa((valor) => valor + 1);
  }

  function selecionarFoto(arquivo: File | null) {
    if (previewUrl.current) {
      URL.revokeObjectURL(previewUrl.current);
    }

    previewUrl.current = "";
    setFoto(null);
    setPreview("");
    setErro("");
    setAviso("");

    if (!arquivo) return;

    const formatos = ["image/jpeg", "image/png", "image/webp"];

    if (!formatos.includes(arquivo.type)) {
      setErro("Selecione uma foto JPG, PNG ou WebP.");
      return;
    }

    if (arquivo.size > 4 * 1024 * 1024) {
        setErro("A foto deve ter no máximo 4 MB.");
        return;
    }

    previewUrl.current = URL.createObjectURL(arquivo);

    setFoto(arquivo);
    setPreview(previewUrl.current);
  }

  async function removerFotoAtual() {
    if (ocupado || !fotoAtual) return;

    const confirmou = window.confirm(
      "Remover a foto atual? Essa ação acontece imediatamente e não pode ser desfeita.",
    );

    if (!confirmou) return;

    setRemovendoFoto(true);
    setErro("");
    setAviso("");

    try {
      const token = await renovarSessao();

      const resposta = await fetch(`/api/produtos/${id}/foto`, {
        method: "DELETE",
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
          resultado.error || "Não foi possível remover a foto.",
        );
      }

      const produto: Produto = resultado;

      selecionarFoto(null);
      setFotoAtual(produto.foto_produto);
      setAviso("Foto removida. Não é necessário salvar essa remoção.");
    } catch (error) {
      if (error instanceof SessaoExpiradaError) {
        router.replace("/login");
        return;
      }

      setErro(
        error instanceof Error
          ? error.message
          : "Erro ao remover a foto.",
      );
    } finally {
      setRemovendoFoto(false);
    }
  }

  async function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (ocupado) return;

    setErro("");
    setAviso("");

    if (!codigo.trim() || !descricao.trim()) {
      setErro("Código e descrição são obrigatórios.");
      return;
    }

    setSalvando(true);

    try {
      const token = await renovarSessao();

      const formulario = new FormData();

      formulario.set("codigo_produto", codigo.trim());
      formulario.set("descricao_produto", descricao.trim());
      formulario.set("status", status);

      if (foto) {
        formulario.set("foto_produto", foto);
      }

      const resposta = await fetch(`/api/produtos/${id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formulario,
      });

      if (resposta.status === 401) {
        throw new SessaoExpiradaError("Entre novamente.");
      }

      const resultado = await resposta.json();

      if (!resposta.ok) {
        const detalhes = resultado.details
          ?.map((item: { message: string }) => item.message)
          .join(". ");

        throw new Error(
          detalhes ||
            resultado.error ||
            "Não foi possível atualizar o produto.",
        );
      }

      router.replace("/produtos");
    } catch (error) {
      if (error instanceof SessaoExpiradaError) {
        router.replace("/login");
        return;
      }

      setErro(
        error instanceof Error
          ? error.message
          : "Erro ao atualizar o produto.",
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
      <section className="mx-auto max-w-lg rounded-xl bg-white p-6 shadow">
        <h1 className="mb-6 text-2xl font-bold">
          Editar produto
        </h1>

        {carregando ? (
          <p role="status">Carregando produto…</p>
        ) : !carregado ? (
          <div className="space-y-4">
            <p role="alert" className="text-red-700">
              {erro || "Não foi possível carregar o produto."}
            </p>

            <button
              type="button"
              onClick={tentarNovamente}
              className="rounded bg-emerald-700 px-4 py-2 text-white"
            >
              Tentar novamente
            </button>

            <Link
              href="/produtos"
              className="block text-slate-600"
            >
              Voltar para a lista
            </Link>
          </div>
        ) : (
          <form onSubmit={salvar} className="space-y-5">
            <div>
              <label
                htmlFor="codigo"
                className="block font-medium"
              >
                Código *
              </label>

              <input
                id="codigo"
                value={codigo}
                onChange={(event) => setCodigo(event.target.value)}
                required
                disabled={ocupado}
                className="mt-1 w-full rounded border border-slate-300 p-3"
              />
            </div>

            <div>
              <label
                htmlFor="descricao"
                className="block font-medium"
              >
                Descrição *
              </label>

              <textarea
                id="descricao"
                value={descricao}
                onChange={(event) =>
                  setDescricao(event.target.value)
                }
                required
                disabled={ocupado}
                rows={3}
                className="mt-1 w-full rounded border border-slate-300 p-3"
              />
            </div>

            <div>
              <label
                htmlFor="status"
                className="block font-medium"
              >
                Status
              </label>

              <select
                id="status"
                value={status}
                onChange={(event) =>
                  setStatus(
                    event.target.value === "ativo"
                      ? "ativo"
                      : "inativo",
                  )
                }
                disabled={ocupado}
                className="mt-1 w-full rounded border border-slate-300 p-3"
              >
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="foto"
                className="block font-medium"
              >
                Foto
              </label>

              <p className="mb-2 text-sm text-slate-600">
                Selecione uma nova foto para substituir a atual.
                JPG, PNG ou WebP de até 5 MB.
              </p>

              <input
                id="foto"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={ocupado}
                onChange={(event) => {
                  selecionarFoto(event.target.files?.[0] || null);
                  event.target.value = "";
                }}
                className="w-full"
              />
            </div>

            {imagemExibida && (
              <div>
                <img
                  src={imagemExibida}
                  alt={
                    foto
                      ? "Pré-visualização da nova foto"
                      : "Foto atual do produto"
                  }
                  className="h-40 w-40 rounded object-cover"
                />

                {foto && (
                  <button
                    type="button"
                    onClick={() => selecionarFoto(null)}
                    disabled={ocupado}
                    className="mt-2 text-sm text-red-700 disabled:opacity-50"
                  >
                    Descartar nova foto
                  </button>
                )}
              </div>
            )}

            {fotoAtual && !foto && (
              <div>
                <button
                  type="button"
                  onClick={removerFotoAtual}
                  disabled={ocupado}
                  className="rounded bg-red-700 px-4 py-2 text-white disabled:opacity-50"
                >
                  {removendoFoto
                    ? "Removendo…"
                    : "Remover foto atual"}
                </button>

                <p className="mt-2 text-sm text-slate-600">
                  A remoção é imediata, mesmo se você cancelar
                  a edição depois.
                </p>
              </div>
            )}

            {aviso && (
              <p
                role="status"
                className="rounded bg-emerald-100 p-3 text-emerald-800"
              >
                {aviso}
              </p>
            )}

            {erro && (
              <p role="alert" className="text-red-700">
                {erro}
              </p>
            )}

            <div className="flex items-center gap-4">
              <button
                type="submit"
                disabled={ocupado}
                className="rounded bg-emerald-700 px-4 py-3 text-white disabled:opacity-50"
              >
                {salvando ? "Salvando…" : "Salvar alterações"}
              </button>

              {!ocupado && (
                <Link
                  href="/produtos"
                  className="text-slate-600"
                >
                  Cancelar
                </Link>
              )}
            </div>
          </form>
        )}
      </section>
    </main>
  );
}