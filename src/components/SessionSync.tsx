"use client";
import { useEffect } from "react";
import { limparSessao, CHAVE_MUDANCA_SESSAO } from "../lib/sessao";
import { limparPreferenciasCatalogo } from "../lib/catalogo";

// Login/logout reload the document so Next's preserved screens cannot retain
// products, photos, drafts or selections from a previous account.
export default function SessionSync() {
  useEffect(() => {
    const read = () => {
      try {
        return localStorage.getItem(CHAVE_MUDANCA_SESSAO);
      } catch {
        return null;
      }
    };
    const initial = read();
    const reset = () => {
      limparSessao();
      limparPreferenciasCatalogo();
      document.documentElement.style.visibility = "hidden";
      window.location.replace("/login");
    };
    const storage = (event: StorageEvent) => {
      if (event.key === CHAVE_MUDANCA_SESSAO) reset();
    };
    const visible = () => {
      if (document.visibilityState === "visible" && read() !== initial) reset();
    };
    const show = (event: PageTransitionEvent) => {
      if (event.persisted) reset();
    };
    window.addEventListener("storage", storage);
    window.addEventListener("pageshow", show);
    document.addEventListener("visibilitychange", visible);
    return () => {
      window.removeEventListener("storage", storage);
      window.removeEventListener("pageshow", show);
      document.removeEventListener("visibilitychange", visible);
    };
  }, []);
  return null;
}
