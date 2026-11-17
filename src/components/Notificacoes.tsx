"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "./Feedback";
import { apiAutenticada } from "../lib/api";
import { SessaoAlteradaError, SessaoExpiradaError } from "../lib/sessao";
import {
  type ListaNotificacoes,
  type Notificacao,
  tituloNotificacao,
  detalhesNotificacao,
  origemNotificacao,
  dataNotificacao,
} from "../lib/notificacoes";
export default function Notificacoes() {
  const router = useRouter();
  const [pagina, setPagina] = useState(1);
  const [aberta, setAberta] = useState(false);
  const [dados, setDados] = useState<ListaNotificacoes | null>(null);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [marcando, setMarcando] = useState(false);
  const pedido = useRef<AbortController | null>(null);
  const vivo = useRef(true);
  const marcacao = useRef(false);
  const ultimaRevisaoRemota = useRef<string | null>(null);
  const falhar = useCallback(
    (e: unknown) => {
      if (!vivo.current) return;
      if (e instanceof SessaoAlteradaError) return;
      if (e instanceof SessaoExpiradaError) {
        router.replace("/login");
        return;
      }
      setErro(
        e instanceof Error
          ? e.message
          : "Não foi possível carregar as notificações.",
      );
    },
    [router],
  );
  const atualizar = useCallback(async () => {
    if (pedido.current) return;
    const controller = new AbortController();
    pedido.current = controller;
    setCarregando(true);
    try {
      const resposta = await apiAutenticada<ListaNotificacoes>(
        `/api/notificacoes?pagina=${pagina}`,
        { signal: controller.signal },
      );
      if (vivo.current && !controller.signal.aborted) {
        setDados(resposta);
        setErro("");
        if (pagina === 1) {
          const chave = resposta.notificacoes
            .filter((n) => n.origem !== "web")
            .map((n) => `${n.id}:${n.revisao}`)
            .join(",");
          if (
            ultimaRevisaoRemota.current !== null &&
            ultimaRevisaoRemota.current !== chave
          )
            window.dispatchEvent(new Event("catalogo-remoto-alterado"));
          ultimaRevisaoRemota.current = chave;
        }
      }
    } catch (e) {
      if (!controller.signal.aborted) falhar(e);
    } finally {
      if (pedido.current === controller) {
        pedido.current = null;
        if (vivo.current) setCarregando(false);
      }
    }
  }, [falhar, pagina]);
  useEffect(() => {
    vivo.current = true;
    void Promise.resolve().then(atualizar);
    const realtime = () => {
      pedido.current?.abort();
      pedido.current = null;
      void atualizar();
    };
    const voltar = () => {
      if (document.visibilityState === "visible") void atualizar();
    };

    window.addEventListener("focus", voltar);
    window.addEventListener("produtos-alterados", voltar);
    window.addEventListener("notificacoes-atualizar", realtime);
    document.addEventListener("visibilitychange", voltar);
    return () => {
      vivo.current = false;
      pedido.current?.abort();
      pedido.current = null;

      window.removeEventListener("focus", voltar);
      window.removeEventListener("produtos-alterados", voltar);
      window.removeEventListener("notificacoes-atualizar", realtime);
      document.removeEventListener("visibilitychange", voltar);
    };
  }, [atualizar]);
  async function ler(itens: Notificacao[]) {
    if (marcacao.current || !itens.length) return;
    marcacao.current = true;
    setMarcando(true);
    setErro("");
    try {
      await apiAutenticada("/api/notificacoes/lidas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notificacoes: itens.map(({ id, revisao }) => ({ id, revisao })),
        }),
      });
      pedido.current?.abort();
      pedido.current = null;
      await atualizar();
    } catch (e) {
      falhar(e);
    } finally {
      marcacao.current = false;
      if (vivo.current) setMarcando(false);
    }
  }
  const naoLidas = dados?.notificacoes.filter((n) => !n.lida) || [];
  return (
    <>
      <button
        className="button button-secondary notification-bell"
        onClick={() => {
          setAberta(true);
          void atualizar();
        }}
        aria-label={`Notificações${dados?.naoLidas ? `, ${dados.naoLidas} não lidas` : ""}`}
      >
        <svg
          aria-hidden="true"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
        </svg>{" "}
        Notificações{" "}
        {dados?.naoLidas ? (
          <span className="notification-count">
            {dados.naoLidas > 99 ? "99+" : dados.naoLidas}
          </span>
        ) : erro ? (
          "· !"
        ) : (
          ""
        )}
      </button>
      {aberta && (
        <Modal
          title="Notificações"
          onClose={() => setAberta(false)}
          className="notification-dialog"
        >
          <p className="notification-help">
            Histórico completo do site e do aplicativo. Som e avisos flutuantes
            são exibidos somente para ações feitas no aplicativo.
          </p>
          <div className="notification-actions">
            <button
              className="button button-secondary"
              disabled={carregando || marcando}
              onClick={() => void atualizar()}
            >
              {carregando ? "Atualizando…" : "Atualizar notificações"}
            </button>
            <button
              className="button button-secondary"
              disabled={!naoLidas.length || marcando || carregando}
              onClick={() => void ler(naoLidas)}
            >
              {marcando ? "Marcando…" : "Marcar exibidas como lidas"}
            </button>
          </div>
          {erro && (
            <p role="alert" className="notification-error">
              {erro}
            </p>
          )}
          {!dados && carregando && (
            <p role="status">Carregando notificações…</p>
          )}
          {dados && !dados.notificacoes.length && (
            <p>Nenhuma notificação por enquanto.</p>
          )}
          <ul className="notification-list">
            {dados?.notificacoes.map((n) => (
              <li
                key={n.id}
                className={`notification-item ${n.lida ? "" : "notification-unread"}`}
              >
                <div className="notification-heading">
                  <strong>{tituloNotificacao(n)}</strong>
                  <span>{n.lida ? "Lida" : "Não lida"}</span>
                </div>
                <p>
                  <strong>{n.descricao}</strong> · {n.codigo}
                </p>
                {n.acao === "editado" && <p>{detalhesNotificacao(n)}</p>}
                <p className="notification-meta">
                  {origemNotificacao(n)} ·{" "}
                  <time dateTime={n.ocorreuEm}>
                    {dataNotificacao(n.ocorreuEm)}
                  </time>
                </p>
                {!n.lida && (
                  <button
                    className="button button-secondary button-small"
                    disabled={marcando || carregando}
                    onClick={() => void ler([n])}
                    aria-label={`Marcar notificação de ${n.descricao} como lida`}
                  >
                    Marcar como lida
                  </button>
                )}
              </li>
            ))}
          </ul>
          {dados && dados.paginas > 1 && (
            <div className="notification-actions">
              <button
                className="button button-secondary"
                disabled={carregando || marcando || dados.pagina <= 1}
                onClick={() => setPagina(dados.pagina - 1)}
              >
                Anteriores
              </button>
              <span>
                Página {dados.pagina} de {dados.paginas}
              </span>
              <button
                className="button button-secondary"
                disabled={
                  carregando || marcando || dados.pagina >= dados.paginas
                }
                onClick={() => setPagina(dados.pagina + 1)}
              >
                Próximas
              </button>
            </div>
          )}
          <div className="dialog-actions">
            <button
              className="button button-secondary"
              onClick={() => setAberta(false)}
            >
              Fechar notificações
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
