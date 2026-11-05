"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Produto } from "../../src/types/produto";
import { apiAutenticada } from "../../src/lib/api";
import { limparSessao, SessaoExpiradaError } from "../../src/lib/sessao";
import {
  formatarData,
  filtrarProdutos,
  type Ordem,
} from "../../src/lib/produtos";
import { Icon, ProductSkeleton, Shell, Spinner } from "../../src/components/ui";

import Checkbox from "../../src/components/Checkbox";
import {
  restringirSelecao,
  selecionarProduto,
  selecionarVisiveis,
  planejarStatus,
  confirmarExclusao,
} from "../../src/lib/selecao";

import {
  PADRAO_CATALOGO,
  lerPreferenciasCatalogo,
  salvarPreferenciasCatalogo,
  limparPreferenciasCatalogo,
  queryCatalogo,
  adaptarPagina,
  type PreferenciasCatalogo,
  type PaginaProdutos,
} from "../../src/lib/catalogo";

type ResultadoLote = {
  solicitados: number;
  jaNoStatus?: number;
  naoEncontrados?: number;
  afetados: number;
  produtos?: Produto[];
  idsExcluidos?: number[];
  fotosNaoRemovidas?: number;
};
type AcaoLote = "ativo" | "inativo" | "excluir";
type Operacao = "status" | "excluir";
export default function ProdutosPage() {
  const router = useRouter();
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());
  const [lote, setLote] = useState<AcaoLote | null>(null);
  const [avisoAtencao, setAvisoAtencao] = useState(false);
  const loteEmAndamento = useRef(false);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [tentativa, setTentativa] = useState(0);
  const [saindo, setSaindo] = useState(false);
  const [pendentes, setPendentes] = useState<Record<number, Operacao>>({});
  const [preferencias, setPreferencias] = useState<PreferenciasCatalogo>({
    ...PADRAO_CATALOGO,
  });
  const [preferenciasProntas, setPreferenciasProntas] = useState(false);
  const [paginaDados, setPaginaDados] = useState<PaginaProdutos>({
    produtos: [],
    total: 0,
    pagina: 1,
    paginas: 1,
    limite: 25,
    resumo: { total: 0, ativos: 0, inativos: 0 },
  });
  const { busca, filtro, ordem, pagina, limite } = preferencias;
  const mutando = Object.keys(pendentes).length > 0 || lote !== null;
  const navegacaoBloqueada = saindo || mutando;

  useEffect(() => {
    let ativo = true;
    void Promise.resolve().then(() => {
      if (ativo) {
        setPreferencias(lerPreferenciasCatalogo());
        setSelecionados(new Set());
        setCarregando(true);
        setPreferenciasProntas(true);
      }
    });
    return () => {
      ativo = false;
    };
  }, []);
  useEffect(() => {
    if (!preferenciasProntas) return;
    let ativo = true;
    const controller = new AbortController();
    const consulta = { busca, filtro, ordem, pagina, limite };
    const timer = setTimeout(() => {
      setCarregando(true);
      void apiAutenticada<PaginaProdutos | Produto[]>(
        `/api/produtos?${queryCatalogo(consulta)}`,
        { signal: controller.signal },
      )
        .then((resposta) => {
          if (!ativo) return;
          const dados = adaptarPagina(resposta, consulta);
          setPaginaDados(dados);
          setProdutos(dados.produtos);
          setSelecionados((ids) => restringirSelecao(ids, dados.produtos));
          if (dados.pagina !== consulta.pagina) {
            const nova = { ...consulta, pagina: dados.pagina };
            salvarPreferenciasCatalogo(nova);
            setPreferencias(nova);
          }
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
    }, 200);
    return () => {
      ativo = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [
    router,
    tentativa,
    preferenciasProntas,
    busca,
    filtro,
    ordem,
    pagina,
    limite,
  ]);

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
      limparPreferenciasCatalogo();
      setSelecionados(new Set());
      router.replace("/login");
    } catch (error) {
      falha(error);
      setSaindo(false);
    }
  }
  async function executar(produto: Produto, operacao: Operacao) {
    if (pendentes[produto.id] || saindo || carregando || lote !== null) return;
    if (operacao === "excluir" && !window.confirm(confirmarExclusao([produto])))
      return;
    setPendentes((p) => ({ ...p, [produto.id]: operacao }));
    setAvisoAtencao(false);
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
      setCarregando(true);
      setTentativa((n) => n + 1);
    } catch (error) {
      falha(error);
    } finally {
      setSelecionados((ids) => selecionarProduto(ids, produto.id, false));
      setPendentes((p) => {
        const novo = { ...p };
        delete novo[produto.id];
        return novo;
      });
    }
  }
  const visiveis = useMemo(
    () =>
      filtrarProdutos(produtos, busca, filtro).sort((a, b) =>
        a.status === b.status ? 0 : a.status === "ativo" ? -1 : 1,
      ),
    [produtos, filtro, busca],
  );
  const selecaoVisivel = restringirSelecao(selecionados, visiveis);
  const quantidade = selecaoVisivel.size;
  const detalhesSelecionados = visiveis.filter((p) => selecaoVisivel.has(p.id));
  const ativosSelecionados = detalhesSelecionados.filter(
    (p) => p.status === "ativo",
  ).length;
  const inativosSelecionados = quantidade - ativosSelecionados;

  const todosMarcados = visiveis.length > 0 && quantidade === visiveis.length;
  const selecaoBloqueada = carregando || saindo || mutando;

  function alterarPreferencias(
    patch: Partial<PreferenciasCatalogo>,
    manterSelecao = false,
  ) {
    const nova = { ...preferencias, ...patch };
    if (manterSelecao)
      setSelecionados(
        restringirSelecao(
          selecaoVisivel,
          filtrarProdutos(produtos, nova.busca, nova.filtro),
        ),
      );
    else setSelecionados(new Set());
    salvarPreferenciasCatalogo(nova);
    setPreferencias(nova);
    setCarregando(true);
    setErro("");
  }
  function mudarCriterio(novaBusca: string, novoFiltro: string) {
    alterarPreferencias(
      { busca: novaBusca, filtro: novoFiltro, pagina: 1 },
      true,
    );
  }
  function marcarProduto(id: number, marcar: boolean) {
    if (selecaoBloqueada) return;
    try {
      setSelecionados(selecionarProduto(selecaoVisivel, id, marcar));
      setErro("");
    } catch (error) {
      falha(error);
    }
  }
  function marcarTodos(marcar: boolean) {
    if (selecaoBloqueada) return;
    try {
      setSelecionados(selecionarVisiveis(visiveis, marcar));
      setErro("");
    } catch (error) {
      falha(error);
    }
  }
  async function executarLote(acao: AcaoLote) {
    if (!quantidade || selecaoBloqueada || loteEmAndamento.current) return;
    const plano =
      acao === "excluir"
        ? null
        : planejarStatus(visiveis, selecaoVisivel, acao);
    const ids = plano ? plano.ids : [...selecaoVisivel];
    if (!ids.length) return;
    const jaEstavam = plano?.jaNoStatus || 0;
    if (
      acao === "excluir" &&
      !window.confirm(confirmarExclusao(detalhesSelecionados))
    )
      return;
    loteEmAndamento.current = true;
    setLote(acao);
    setErro("");
    setAviso("");
    setAvisoAtencao(false);
    try {
      const resultado = await apiAutenticada<ResultadoLote>(
        acao === "excluir" ? "/api/produtos" : "/api/produtos/status",
        {
          method: acao === "excluir" ? "DELETE" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            acao === "excluir" ? { ids } : { ids, status: acao },
          ),
        },
      );
      const solicitados = new Set(ids);
      if (acao === "excluir") {
        setProdutos((lista) => lista.filter((p) => !solicitados.has(p.id)));
      } else {
        const atualizados = new Map(
          (resultado.produtos || []).map((p) => [p.id, p]),
        );
        setProdutos((lista) =>
          lista
            .filter((p) => !solicitados.has(p.id) || atualizados.has(p.id))
            .map((p) => atualizados.get(p.id) || p),
        );
      }
      setSelecionados(new Set());
      const total = resultado.afetados;
      const jaNoStatus = jaEstavam + (resultado.jaNoStatus || 0);
      const ausentes =
        resultado.naoEncontrados ??
        Math.max(
          0,
          resultado.solicitados -
            resultado.afetados -
            (resultado.jaNoStatus || 0),
        );
      const contagem = ausentes
        ? `${total} de ${resultado.solicitados}`
        : String(total);
      let mensagem =
        acao === "excluir"
          ? `${contagem} ${total === 1 ? "produto excluído" : "produtos excluídos"}.`
          : `${contagem} ${total === 1 ? "produto alterado" : "produtos alterados"} para ${acao === "ativo" ? "ativo" : "inativo"}${total === 1 ? "" : "s"}.`;
      if (jaNoStatus)
        mensagem += ` ${jaNoStatus} já ${jaNoStatus === 1 ? "estava" : "estavam"} ${acao === "ativo" ? "ativo" : "inativo"}${jaNoStatus === 1 ? "" : "s"}.`;
      if (ausentes)
        mensagem +=
          " Alguns produtos já não existiam. A lista foi sincronizada.";
      if (resultado.fotosNaoRemovidas) {
        mensagem += ` Os produtos foram excluídos, mas ${resultado.fotosNaoRemovidas} foto(s) não puderam ser removidas do armazenamento.`;
        setAvisoAtencao(true);
      }
      setAviso(mensagem);
      setCarregando(true);
      setTentativa((n) => n + 1);
    } catch (error) {
      falha(error);
    } finally {
      loteEmAndamento.current = false;
      setLote(null);
    }
  }
  const ativos = paginaDados.resumo.ativos;
  const inicial = carregando && produtos.length === 0;

  function acoes(produto: Produto) {
    const operacao = pendentes[produto.id];
    const bloqueado = !!operacao || saindo || carregando || lote !== null;
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
          <strong>{inicial ? "—" : paginaDados.resumo.total}</strong>
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
          <strong>{inicial ? "—" : paginaDados.resumo.inativos}</strong>
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
          <div
            role="status"
            className={`notice ${avisoAtencao ? "notice-warning" : "notice-success"}`}
          >
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
              maxLength={120}
              disabled={lote !== null}
              onChange={(e) => mudarCriterio(e.target.value, filtro)}
            />
          </div>
          <label className="compact-field">
            <span>Status</span>
            <select
              aria-label="Filtrar por status"
              value={filtro}
              disabled={lote !== null}
              onChange={(e) => mudarCriterio(busca, e.target.value)}
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
              disabled={lote !== null}
              onChange={(e) =>
                alterarPreferencias({
                  ordem: e.target.value as Ordem,
                  pagina: 1,
                })
              }
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
              : `${paginaDados.total} ${paginaDados.total === 1 ? "produto" : "produtos"} · ${visiveis.length} nesta página`}
          </span>
          <span role="status">
            {carregando && !inicial
              ? "Atualizando lista…"
              : ordem === "atualizados"
                ? "Ativos primeiro · Mais recentes por grupo"
                : ""}
          </span>
        </div>
        {carregando && !visiveis.length ? (
          <ProductSkeleton />
        ) : !visiveis.length ? (
          <div className="empty-state">
            <span className="empty-symbol">
              <Icon name="box" size={34} />
            </span>
            <h2>
              {paginaDados.resumo.total
                ? "Nenhum produto encontrado"
                : erro
                  ? "Seu catálogo não carregou"
                  : "Seu catálogo começa aqui"}
            </h2>
            <p>
              {paginaDados.resumo.total
                ? "Ajuste a busca ou o filtro para encontrar o que precisa."
                : erro
                  ? "Tente atualizar a lista novamente."
                  : "Adicione seu primeiro produto e mantenha tudo em ordem."}
            </p>
            {!paginaDados.resumo.total && !erro && (
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
                    <th scope="col" className="selection-cell">
                      <Checkbox
                        label="Selecionar todos os produtos visíveis"
                        checked={todosMarcados}
                        mixed={quantidade > 0 && !todosMarcados}
                        disabled={selecaoBloqueada || !visiveis.length}
                        onChange={marcarTodos}
                      />
                    </th>
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
                    <tr
                      key={p.id}
                      aria-busy={!!pendentes[p.id] || lote !== null}
                      className={
                        selecaoVisivel.has(p.id) ? "product-selected" : ""
                      }
                    >
                      <td className="selection-cell">
                        <Checkbox
                          label={`Selecionar ${p.descricao_produto}`}
                          checked={selecaoVisivel.has(p.id)}
                          disabled={selecaoBloqueada}
                          onChange={(marcar) => marcarProduto(p.id, marcar)}
                        />
                      </td>
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
              <div className="mobile-select-all">
                <Checkbox
                  label="Selecionar todos os produtos visíveis"
                  checked={todosMarcados}
                  mixed={quantidade > 0 && !todosMarcados}
                  disabled={selecaoBloqueada || !visiveis.length}
                  onChange={marcarTodos}
                />
                <span>Selecionar visíveis</span>
              </div>
              {visiveis.map((p) => (
                <article
                  key={p.id}
                  className={`mobile-product ${selecaoVisivel.has(p.id) ? "product-selected" : ""}`}
                  aria-busy={!!pendentes[p.id]}
                >
                  <div className="mobile-product-top">
                    <Checkbox
                      label={`Selecionar ${p.descricao_produto}`}
                      checked={selecaoVisivel.has(p.id)}
                      disabled={selecaoBloqueada}
                      onChange={(marcar) => marcarProduto(p.id, marcar)}
                    />
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
        <div className="pagination-bar">
          <label>
            Por página{" "}
            <select
              aria-label="Produtos por página"
              value={limite}
              disabled={carregando || mutando || saindo}
              onChange={(e) =>
                alterarPreferencias({
                  limite: Number(e.target.value),
                  pagina: 1,
                })
              }
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <span role="status" aria-label="Página atual">
            Página {paginaDados.pagina} de {paginaDados.paginas}
          </span>
          <nav aria-label="Paginação de produtos">
            <button
              className="button button-secondary"
              disabled={
                carregando || mutando || saindo || paginaDados.pagina <= 1
              }
              onClick={() =>
                alterarPreferencias({ pagina: paginaDados.pagina - 1 })
              }
            >
              Anterior
            </button>
            <button
              className="button button-secondary"
              disabled={
                carregando ||
                mutando ||
                saindo ||
                paginaDados.pagina >= paginaDados.paginas
              }
              onClick={() =>
                alterarPreferencias({ pagina: paginaDados.pagina + 1 })
              }
            >
              Próxima
            </button>
          </nav>
        </div>
      </section>
      {quantidade > 0 && (
        <>
          <div className="bulk-space" />
          <section
            className="bulk-actions"
            aria-label="Ações dos produtos selecionados"
            aria-busy={lote !== null}
          >
            <strong aria-live="polite">
              {quantidade} {quantidade === 1 ? "selecionado" : "selecionados"}
              <span className="selection-counts">
                {ativosSelecionados}{" "}
                {ativosSelecionados === 1 ? "ativo" : "ativos"} ·{" "}
                {inativosSelecionados}{" "}
                {inativosSelecionados === 1 ? "inativo" : "inativos"}
              </span>
            </strong>
            <div className="bulk-buttons">
              <button
                className="button button-secondary"
                aria-label="Ativar selecionados"
                title={
                  !inativosSelecionados
                    ? "Todos os selecionados já estão ativos"
                    : "Ativar somente os inativos selecionados"
                }
                disabled={selecaoBloqueada || !inativosSelecionados}
                onClick={() => void executarLote("ativo")}
              >
                {lote === "ativo" ? <Spinner /> : <Icon name="check" />}
                {lote === "ativo" ? "Ativando…" : "Ativar"}
              </button>
              <button
                className="button button-secondary"
                aria-label="Inativar selecionados"
                title={
                  !ativosSelecionados
                    ? "Todos os selecionados já estão inativos"
                    : "Inativar somente os ativos selecionados"
                }
                disabled={selecaoBloqueada || !ativosSelecionados}
                onClick={() => void executarLote("inativo")}
              >
                {lote === "inativo" ? <Spinner /> : <Icon name="clock" />}
                {lote === "inativo" ? "Inativando…" : "Inativar"}
              </button>
              <button
                className="button button-danger"
                aria-label="Excluir selecionados"
                disabled={selecaoBloqueada}
                onClick={() => void executarLote("excluir")}
              >
                {lote === "excluir" ? <Spinner /> : <Icon name="trash" />}
                {lote === "excluir" ? "Excluindo…" : "Excluir"}
              </button>
              <button
                className="text-button"
                disabled={selecaoBloqueada}
                onClick={() => setSelecionados(new Set())}
              >
                Limpar seleção
              </button>
            </div>
          </section>
        </>
      )}
      <p className="history-note">
        As datas anteriores ao registro do histórico aparecem como “Não
        registrada”. Horários no fuso do seu dispositivo.
      </p>
    </Shell>
  );
}
