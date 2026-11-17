"use client";
import { usePathname } from "next/navigation";
import Notificacoes from "./Notificacoes";
export default function NotificacoesMenu() {
  const pathname = usePathname();
  return pathname.startsWith("/produtos") ? <Notificacoes /> : null;
}
