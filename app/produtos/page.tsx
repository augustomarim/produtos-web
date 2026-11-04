"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Produto } from "../../src/types/produto";
import { apiAutenticada } from "../../src/lib/api";
import { limparSessao, SessaoExpiradaError } from "../../src/lib/sessao";
import {
  formatarData,
  ordenarProdutos,
  filtrarProdutos,
  type Ordem,
} from "../../src/lib/produtos";
import { Icon, ProductSkeleton, Shell, Spinner } from "../../src/components/ui";

type Operacao = "status" | "excluir";
export default function ProdutosPage() {
  const router = useRouter();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [tentativa, setTentativa] = useState(0);
  const [saindo, setSaindo] = useState(false);
  const [pendentes, setPendentes] = useState<Record<number, Operacao>>({});
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [ordem, setOrdem] = useState<Ordem>("atualizados");
  const mutando = Object.keys(pendentes).length > 0;
  const navegacaoBloqueada = saindo || mutando;

  useEffect(() => {
    let ativo = true;
    const controller = new AbortController();
    void apiAutenticada<Produto[]>("/api/produtos", {
      signal: controller.signal,
    })
      .then((dados) => {
        if (ativo) setProdutos(dados);
      })
      .catch((error) => {
        if (!ativo) return;
        if (error instanceof SessaoExpiradaError) {
          router.replace("/login");
          return;
        }
        setErro(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar os produtos.",
        );
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
      controller.abort();
    };
  }, [router, tentativa]);

  function falha(error: unknown) {
    if (error instanceof SessaoExpiradaError) {
      router.replace("/login");
      return;
    }
    setErro(
      error instanceof Error
        ? error.message
        : "Não foi possível concluir a operação.",
    );
  }
  function atualizar() {
    setErro("");
    setCarregando(true);
    setTentativa((n) => n + 1);
  }
  async function sair() {
    setSaindo(true);
    setErro("");
    try {
      const resposta = await fetch("/api/auth/logout", { method: "POST" });
      if (!resposta.ok)
        throw new Error("Não foi possível sair. Tente novamente.");
      limparSessao();
      router.replace("/login");
    } catch (error) {
      falha(error);
      setSaindo(false);
    }
  }
  async function executar(produto: Produto, operacao: Operacao) {
    if (pendentes[produto.id] || saindo || carregando) return;
    if (
      operacao === "excluir" &&
      !window.confirm(
        `Excluir “${produto.descricao_produto}”? Essa ação não pode ser desfeita.`,
      )
    )
      return;
    setPendentes((p) => ({ ...p, [produto.id]: operacao }));
    setErro("");
    setAviso("");
    try {
      if (operacao === "status") {
        const atualizado = await apiAutenticada<Produto>(
          `/api/produtos/${produto.id}/status`,
          { method: "PATCH" },
        );
        setProdutos((lista) =>
          lista.map((p) => (p.id === atualizado.id ? atualizado : p)),
        );
        setAviso(
          `${atualizado.descricao_produto}: produto ${atualizado.status === "ativo" ? "ativado" : "inativado"}.`,
        );
      } else {
        await apiAutenticada<void>(`/api/produtos/${produto.id}`, {
          method: "DELETE",
        });
        setProdutos((lista) => lista.filter((p) => p.id !== produto.id));
        setAviso("Produto excluído.");
      }
    } catch (error) {
      falha(error);
    } finally {
      setPendentes((p) => {
        const novo = { ...p };
        delete novo[produto.id];
        return novo;
      });
    }
  }
  const visiveis = useMemo(
    () => ordenarProdutos(filtrarProdutos(produtos, busca, filtro), ordem),
    [produtos, filtro, busca, ordem],
  );
  const ativos = produtos.filter((p) => p.status === "ativo").length;
  const inicial = carregando && produtos.length === 0;

  function acoes(produto: Produto) {
    const operacao = pendentes[produto.id];
    const bloqueado = !!operacao || saindo || carregando;
    return (
      <div className="row-actions">
        <Link
          href={`/produtos/${produto.id}/editar`}
          className="button button-quiet"
          aria-disabled={bloqueado}
          onClick={(e) => {
            if (bloqueado) e.preventDefault();
          }}
        >
          <Icon name="edit" />
          Editar
        </Link>
        <button
          className="button button-quiet status-action"
          disabled={bloqueado}
          onClick={() => void executar(produto, "status")}
          aria-label={`${produto.status === "ativo" ? "Inativar" : "Ativar"} ${produto.descricao_produto}`}
        >
          {operacao === "status" ? (
            <>
              <Spinner />
              Atualizando…
            </>
          ) : produto.status === "ativo" ? (
            "Inativar"
          ) : (
            "Ativar"
          )}
        </button>
        <button
          className="button button-danger"
          disabled={bloqueado}
          onClick={() => void executar(produto, "excluir")}
          aria-label={`Excluir ${produto.descricao_produto}`}
        >
          {operacao === "excluir" ? <Spinner /> : <Icon name="trash" />}
          <span>{operacao === "excluir" ? "Excluindo…" : "Excluir"}</span>
        </button>
      </div>
    );
  }
  function imagem(p: Produto) {
    const url = p.foto_miniatura || p.foto_produto;
    return url ? (
      <img
        className="product-photo"
        src={url}
        alt={p.descricao_produto}
        width={56}
        height={56}
        loading="lazy"
        decoding="async"
      />
    ) : (
      <span
        className="product-photo photo-empty"
        role="img"
        aria-label="Produto sem foto"
      >
        <Icon name="image" size={24} />
      </span>
    );
  }
  return (
    <Shell>
      <div className="page-heading">
        <div>
          <span className="eyebrow">CATÁLOGO</span>
          <h1>Seus produtos</h1>
          <p className="muted">Tudo organizado. Sempre atualizado.</p>
        </div>
        <div className="page-actions">
          <button
            className="button button-secondary"
            onClick={() => void sair()}
            disabled={saindo || mutando || carregando}
          >
            {saindo ? <Spinner /> : <Icon name="logout" />}
            {saindo ? "Saindo…" : "Sair"}
          </button>
          <Link
            href="/produtos/novo"
            className="button button-primary"
            aria-disabled={navegacaoBloqueada}
            onClick={(e) => {
              if (navegacaoBloqueada) e.preventDefault();
            }}
          >
            <Icon name="plus" />
            Novo produto
          </Link>
        </div>
      </div>
      <div className="summary-grid">
        <div className="summary-card">
          <span>Total de produtos</span>
          <strong>{inicial ? "—" : produtos.length}</strong>
          <span className="summary-icon">
            <Icon name="box" size={23} />
          </span>
        </div>
        <div className="summary-card">
          <span>Ativos</span>
          <strong className="text-green">{inicial ? "—" : ativos}</strong>
          <span className="summary-icon green">
            <Icon name="check" size={23} />
          </span>
        </div>
        <div className="summary-card">
          <span>Inativos</span>
          <strong>{inicial ? "—" : produtos.length - ativos}</strong>
          <span className="summary-icon">
            <Icon name="clock" size={23} />
          </span>
        </div>
      </div>
      <div className="feedback-slot">
        {erro ? (
          <div role="alert" className="notice notice-error">
            {erro}
            <button
              className="text-button"
              onClick={atualizar}
              disabled={carregando || mutando}
            >
              Tentar novamente
            </button>
          </div>
        ) : aviso ? (
          <div role="status" className="notice notice-success">
            <Icon name="check" />
            {aviso}
          </div>
        ) : null}
      </div>
      <section className="catalog-panel" aria-label="Catálogo de produtos">
        <div className="catalog-toolbar">
          <div className="search-field">
            <Icon name="search" />
            <input
              aria-label="Buscar produtos"
              placeholder="Buscar por nome…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <label className="compact-field">
            <span>Status</span>
            <select
              aria-label="Filtrar por status"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
            >
              <option value="todos">Todos</option>
              <option value="ativo">Ativos</option>
              <option value="inativo">Inativos</option>
            </select>
          </label>
          <label className="compact-field order-field">
            <span>Ordenar por</span>
            <select
              aria-label="Ordenar por"
              value={ordem}
              onChange={(e) => setOrdem(e.target.value as Ordem)}
            >
              <option value="atualizados">Última alteração</option>
              <option value="criados">Criação mais recente</option>
              <option value="codigo">Código</option>
            </select>
          </label>
          <button
            className="button button-secondary refresh-button"
            onClick={atualizar}
            disabled={carregando || mutando || saindo}
          >
            {carregando ? <Spinner /> : <Icon name="refresh" />}
            <span>Atualizar</span>
          </button>
        </div>
        <div className="list-caption">
          <span>
            {inicial
              ? "Preparando seu catálogo"
              : `${visiveis.length} ${visiveis.length === 1 ? "produto" : "produtos"}`}
          </span>
          <span role="status">
            {carregando && !inicial
              ? "Atualizando lista…"
              : ordem === "atualizados"
                ? "Ativos primeiro · Mais recentes por grupo"
                : ""}
          </span>
        </div>
        {inicial ? (
          <ProductSkeleton />
        ) : !visiveis.length ? (
          <div className="empty-state">
            <span className="empty-symbol">
              <Icon name="box" size={34} />
            </span>
            <h2>
              {produtos.length
                ? "Nenhum produto encontrado"
                : erro
                  ? "Seu catálogo não carregou"
                  : "Seu catálogo começa aqui"}
            </h2>
            <p>
              {produtos.length
                ? "Ajuste a busca ou o filtro para encontrar o que precisa."
                : erro
                  ? "Tente atualizar a lista novamente."
                  : "Adicione seu primeiro produto e mantenha tudo em ordem."}
            </p>
            {!produtos.length && !erro && (
              <Link href="/produtos/novo" className="button button-primary">
                <Icon name="plus" />
                Adicionar produto
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="desktop-products">
              <table className="products-table">
                <thead>
                  <tr>
                    <th scope="col">Produto</th>
                    <th scope="col">Status</th>
                    <th scope="col">Datas</th>
                    <th scope="col" className="actions-heading">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visiveis.map((p) => (
                    <tr key={p.id} aria-busy={!!pendentes[p.id]}>
                      <td>
                        <div className="product-identity">
                          {imagem(p)}
                          <div>
                            <strong>{p.descricao_produto}</strong>
                            <span className="product-code">
                              {p.codigo_produto}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`status-badge ${p.status}`}>
                          <span />
                          {p.status === "ativo" ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td>
                        <div className="product-dates">
                          <span>
                            Alterado{" "}
                            <time dateTime={p.updatedAt || undefined}>
                              {formatarData(p.updatedAt)}
                            </time>
                          </span>
                          <span>
                            Criado{" "}
                            <time dateTime={p.createdAt || undefined}>
                              {formatarData(p.createdAt)}
                            </time>
                          </span>
                        </div>
                      </td>
                      <td>{acoes(p)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mobile-products">
              {visiveis.map((p) => (
                <article
                  key={p.id}
                  className="mobile-product"
                  aria-busy={!!pendentes[p.id]}
                >
                  <div className="mobile-product-top">
                    <div className="product-identity">
                      {imagem(p)}
                      <div>
                        <strong>{p.descricao_produto}</strong>
                        <span className="product-code">{p.codigo_produto}</span>
                      </div>
                    </div>
                    <span className={`status-badge ${p.status}`}>
                      <span />
                      {p.status === "ativo" ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                  <div className="product-dates">
                    <span>
                      Alterado{" "}
                      <time dateTime={p.updatedAt || undefined}>
                        {formatarData(p.updatedAt)}
                      </time>
                    </span>
                    <span>
                      Criado{" "}
                      <time dateTime={p.createdAt || undefined}>
                        {formatarData(p.createdAt)}
                      </time>
                    </span>
                  </div>
                  {acoes(p)}
                </article>
              ))}
            </div>
          </>
        )}
      </section>
      <p className="history-note">
        As datas anteriores ao registro do histórico aparecem como “Não
        registrada”. Horários no fuso do seu dispositivo.
      </p>
    </Shell>
  );
}
