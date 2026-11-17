"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { SessaoExpiradaError } from "../lib/sessao";
import { apiAutenticada } from "../lib/api";
import { conectarTempoReal, type EstadoConexao } from "../lib/tempo-real";
import {
  tituloAviso,
  eventosParaAlertar,
  detalhesNotificacao,
  dataNotificacao,
  type Notificacao,
} from "../lib/notificacoes";
export default function NotificacoesTempoReal() {
  const router = useRouter();
  const pathname = usePathname();
  const ativo = pathname.startsWith("/produtos");
  const [avisos, setAvisos] = useState<{ id: number; itens: Notificacao[] }[]>(
    [],
  );
  const [estado, setEstado] = useState<EstadoConexao>("conectando");
  const [som, setSom] = useState(true);
  const [liberado, setLiberado] = useState(false);
  const audio = useRef<AudioContext | null>(null);
  const somAtual = useRef(true);
  const ultimoSom = useRef(0);
  const tocar = useCallback(() => {
    if (
      !somAtual.current ||
      !audio.current ||
      audio.current.state !== "running" ||
      Date.now() - ultimoSom.current < 700
    )
      return;
    ultimoSom.current = Date.now();
    const ctx = audio.current;
    const gain = ctx.createGain();
    const os = ctx.createOscillator();
    os.type = "sine";
    os.frequency.setValueAtTime(880, ctx.currentTime);
    os.frequency.setValueAtTime(1174, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.32);
    os.connect(gain);
    gain.connect(ctx.destination);
    os.start();
    os.stop(ctx.currentTime + 0.33);
    os.onended = () => {
      os.disconnect();
      gain.disconnect();
    };
  }, []);
  async function liberar() {
    try {
      audio.current ??= new AudioContext();
      await audio.current.resume();
      setLiberado(audio.current.state === "running");
    } catch {
      setLiberado(false);
    }
  }
  useEffect(() => {
    const destravar = (e: Event) => {
      if (
        e.target instanceof Element &&
        e.target.closest("[data-sound-control]")
      )
        return;
      void liberar();
    };
    document.addEventListener("pointerdown", destravar, { once: true });
    document.addEventListener("keydown", destravar, { once: true });
    return () => {
      document.removeEventListener("pointerdown", destravar);
      document.removeEventListener("keydown", destravar);
    };
  }, []);
  useEffect(() => {
    if (!ativo) {
      void Promise.resolve().then(() => setAvisos([]));
      return;
    }
    const parar = conectarTempoReal({
      ticket: async () => {
        try {
          return await apiAutenticada<{ url: string; ticket: string }>(
            "/api/notificacoes/conexao",
          );
        } catch (e) {
          if (e instanceof SessaoExpiradaError) router.replace("/login");
          throw e;
        }
      },
      estado: setEstado,
      conectado: () => {
        window.dispatchEvent(new Event("notificacoes-atualizar"));
        window.dispatchEvent(new Event("catalogo-remoto-alterado"));
      },
      receber: (itens) => {
        window.dispatchEvent(new Event("notificacoes-atualizar"));
        window.dispatchEvent(new Event("catalogo-remoto-alterado"));
        const externos = eventosParaAlertar(itens, "web");
        if (!externos.length) return;
        const id = externos[0].id;
        setAvisos((atuais) => [{ id, itens: externos }, ...atuais].slice(0, 3));
        tocar();
      },
    });
    return parar;
  }, [ativo, tocar, router]);
  useEffect(() => {
    if (!avisos.length) return;
    const timer = setTimeout(
      () => setAvisos((atual) => atual.slice(0, -1)),
      10000,
    );
    return () => clearTimeout(timer);
  }, [avisos]);
  useEffect(
    () => () => {
      void audio.current?.close();
    },
    [],
  );
  if (!ativo) return null;
  return (
    <>
      <div className="realtime-control">
        <span
          role="status"
          className={`connection-dot ${estado === "conectado" ? "connected" : ""}`}
        />
        <span>
          {estado === "conectado"
            ? "Em tempo real"
            : estado === "conectando"
              ? "Conectando…"
              : "Reconectando…"}
        </span>
        <button
          data-sound-control
          type="button"
          onClick={() => {
            if (!liberado) {
              void liberar().then(() => tocar());
              return;
            }
            somAtual.current = !somAtual.current;
            setSom(somAtual.current);
          }}
          aria-label={
            !liberado
              ? "Ativar som das notificações"
              : som
                ? "Silenciar notificações"
                : "Ativar som das notificações"
          }
        >
          {!liberado ? "Ativar som" : som ? "Som ligado" : "Som desligado"}
        </button>
      </div>
      <div
        className="notification-bubbles"
        aria-live="polite"
        aria-relevant="additions"
      >
        {avisos.map(({ id, itens }) => {
          const n = itens[0];
          return (
            <article className="notification-bubble" key={id}>
              <div>
                <strong>{tituloAviso(itens)}</strong>
                <button
                  type="button"
                  aria-label="Fechar notificação"
                  onClick={() => setAvisos((a) => a.filter((x) => x.id !== id))}
                >
                  ×
                </button>
              </div>
              <p>
                {n.descricao}
                {itens.length > 1 ? ` e mais ${itens.length - 1}` : ""}
              </p>
              {itens.length === 1 && n.acao === "editado" && (
                <p>{detalhesNotificacao(n)}</p>
              )}
              <small>Pelo aplicativo · {dataNotificacao(n.ocorreuEm)}</small>
            </article>
          );
        })}
      </div>
    </>
  );
}
