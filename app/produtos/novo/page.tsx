"use client";

/* eslint-disable @next/next/no-img-element */

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  renovarSessao,
  SessaoExpiradaError,
} from "../../../src/lib/sessao";

export default function NovoProdutoPage() {
  const router = useRouter();

  const [codigo, setCodigo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [foto, setFoto] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  const previewUrl = useRef("");

  useEffect(() => {
    return () => {
      if (previewUrl.current) {
        URL.revokeObjectURL(previewUrl.current);
      }
    };
  }, []);

  function selecionarFoto(arquivo: File | null) {
    if (previewUrl.current) {
      URL.revokeObjectURL(previewUrl.current);
    }

    previewUrl.current = "";
    setFoto(null);
    setPreview("");
    setErro("");

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

  async function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro("");

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

      if (foto) {
        formulario.set("foto_produto", foto);
      }

      const resposta = await fetch("/api/produtos", {
        method: "POST",
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
          detalhes || resultado.error || "Não foi possível salvar.",
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
          : "Não foi possível salvar o produto.",
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
      <section className="mx-auto max-w-lg rounded-xl bg-white p-6 shadow">
        <h1 className="mb-6 text-2xl font-bold">Novo produto</h1>

        <form onSubmit={salvar} className="space-y-5">
          <div>
            <label htmlFor="codigo" className="block font-medium">
              Código *
            </label>

            <input
              id="codigo"
              value={codigo}
              onChange={(event) => setCodigo(event.target.value)}
              required
              disabled={salvando}
              className="mt-1 w-full rounded border border-slate-300 p-3"
            />
          </div>

          <div>
            <label htmlFor="descricao" className="block font-medium">
              Descrição *
            </label>

            <textarea
              id="descricao"
              value={descricao}
              onChange={(event) => setDescricao(event.target.value)}
              required
              disabled={salvando}
              rows={3}
              className="mt-1 w-full rounded border border-slate-300 p-3"
            />
          </div>

          <div>
            <label htmlFor="foto" className="block font-medium">
              Foto
            </label>

            <p className="mb-2 text-sm text-slate-600">
              Opcional. JPG, PNG ou WebP de até 5 MB.
            </p>

            <input
              id="foto"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={salvando}
              onChange={(event) => {
                selecionarFoto(event.target.files?.[0] || null);
                event.target.value = "";
              }}
              className="w-full"
            />
          </div>

          {preview && (
            <div>
              <img
                src={preview}
                alt="Pré-visualização do produto"
                className="h-40 w-40 rounded object-cover"
              />

              <button
                type="button"
                onClick={() => selecionarFoto(null)}
                disabled={salvando}
                className="mt-2 text-sm text-red-700"
              >
                Remover seleção
              </button>
            </div>
          )}

          {erro && (
            <p role="alert" className="text-red-700">
              {erro}
            </p>
          )}

          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={salvando}
              className="rounded bg-emerald-700 px-4 py-3 text-white disabled:opacity-50"
            >
              {salvando ? "Salvando…" : "Salvar produto"}
            </button>

            {!salvando && (
              <Link href="/produtos" className="text-slate-600">
                Cancelar
              </Link>
            )}
          </div>
        </form>
      </section>
    </main>
  );
}