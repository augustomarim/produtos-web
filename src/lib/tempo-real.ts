import { io, type Socket } from "socket.io-client";
import type { Notificacao } from "./notificacoes";
export type EstadoConexao = "conectando" | "conectado" | "reconectando";
type Config = {
  ticket: () => Promise<{ url: string; ticket: string }>;
  receber: (eventos: Notificacao[]) => void;
  conectado: () => void;
  estado: (estado: EstadoConexao) => void;
};
export function conectarTempoReal(config: Config) {
  let encerrado = false;
  let socket: Socket | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let falhas = 0;
  const vistos = new Set<number>();
  const reagendar = () => {
    if (encerrado || timer) return;
    config.estado("reconectando");
    timer = setTimeout(
      () => {
        timer = undefined;
        void conectar();
      },
      Math.min(15000, 1000 * 2 ** Math.min(falhas++, 4)),
    );
  };
  async function conectar() {
    if (encerrado) return;
    config.estado(falhas ? "reconectando" : "conectando");
    try {
      const dados = await config.ticket();
      if (encerrado) return;
      if (!dados.url || !dados.ticket) throw new Error("Conexão indisponível.");
      socket?.removeAllListeners();
      socket?.disconnect();
      const atual = io(dados.url, {
        transports: ["websocket"],
        reconnection: false,
        timeout: 10000,
        auth: { ticket: dados.ticket },
      });
      socket = atual;
      atual.on("connect", () => {
        falhas = 0;
        config.estado("conectado");
        config.conectado();
      });
      atual.on("notificacoes", (entrada: unknown) => {
        if (encerrado || !Array.isArray(entrada)) return;
        const eventos = entrada.filter(
          (n): n is Notificacao =>
            !!n &&
            Number.isInteger(n.id) &&
            n.id > 0 &&
            typeof n.descricao === "string" &&
            Array.isArray(n.campos) &&
            ["criado", "editado", "removido"].includes(n.acao) &&
            ["web", "mobile", "api"].includes(n.origem) &&
            !vistos.has(n.id),
        );
        for (const n of eventos) vistos.add(n.id);
        while (vistos.size > 5000) vistos.delete(vistos.values().next().value!);
        if (eventos.length) config.receber(eventos);
      });
      atual.on("disconnect", reagendar);
      atual.on("connect_error", () => {
        atual.disconnect();
        reagendar();
      });
    } catch {
      reagendar();
    }
  }
  void conectar();
  return () => {
    encerrado = true;
    if (timer) clearTimeout(timer);
    socket?.removeAllListeners();
    socket?.disconnect();
  };
}
