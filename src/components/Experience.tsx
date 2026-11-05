"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import { Modal, useFeedback } from "./Feedback";
import { Spinner } from "./ui";
import type { Produto } from "../types/produto";

export function SlowFeedback({
  active,
  message,
}: {
  active: boolean;
  message: string;
}) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const reset = setTimeout(() => setSlow(false), 0);
    const timer = active ? setTimeout(() => setSlow(true), 5000) : undefined;
    return () => {
      clearTimeout(reset);
      clearTimeout(timer);
    };
  }, [active, message]);
  if (!active)
    return (
      <div className="operation-feedback operation-idle" aria-hidden="true" />
    );
  return (
    <div className="operation-feedback" role="status">
      <Spinner />
      <span>
        {message}
        {slow && (
          <small>
            O servidor está demorando para responder. Aguarde; não é preciso
            enviar novamente.
          </small>
        )}
      </span>
    </div>
  );
}
export function PhotoViewer({
  src,
  thumbnail,
  name,
  className = "product-photo",
  loading = "lazy",
}: {
  src: string;
  thumbnail?: string | null;
  name: string;
  className?: string;
  loading?: "lazy" | "eager";
}) {
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <>
      <button
        type="button"
        className="photo-zoom"
        aria-label={`Ampliar foto de ${name}`}
        onClick={() => {
          setFailed(false);
          setOpen(true);
        }}
      >
        <img
          src={thumbnail || src}
          alt={name}
          className={className}
          loading={loading}
          decoding="async"
        />
      </button>
      {open && (
        <Modal
          title={`Foto de ${name}`}
          onClose={() => setOpen(false)}
          className="image-dialog"
        >
          {failed ? (
            <p role="alert">Não foi possível carregar esta foto.</p>
          ) : (
            <img
              className="enlarged-photo"
              src={src}
              alt={name}
              onError={() => setFailed(true)}
            />
          )}
          <div className="dialog-actions">
            <button
              autoFocus
              type="button"
              className="button button-secondary"
              onClick={() => setOpen(false)}
            >
              Fechar foto
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
export function DeleteDescription({ produtos }: { produtos: Produto[] }) {
  return (
    <>
      <p>Confira os produtos que serão excluídos:</p>
      <ul className="delete-products">
        {produtos.slice(0, 5).map((p) => (
          <li key={p.id}>
            <strong>{p.descricao_produto}</strong>
            <span>{p.codigo_produto}</span>
          </li>
        ))}
      </ul>
      {produtos.length > 5 && <p>… e mais {produtos.length - 5} produtos.</p>}
      <p className="destructive-hint">
        As fotos associadas também serão removidas. Essa ação não pode ser
        desfeita.
      </p>
    </>
  );
}
// Native unload protection covers reload/closing the tab. Links use Next's onNavigate.
// The Navigation API also lets supporting browsers cancel back/forward before URL changes.
export function useUnsavedChanges(
  dirty: boolean,
  busy: boolean,
  onDiscard: () => void,
) {
  const { confirm, guardRef } = useFeedback();
  const approved = useRef(false);
  useEffect(() => {
    if (!dirty && !busy) return;
    approved.current = false;
    const ask = async () => {
      if (busy) return false;
      const leave = await confirm({
        title: "Descartar alterações?",
        description:
          "Você tem alterações que ainda não foram salvas. Ao sair, elas serão perdidas.",
        confirmLabel: "Descartar e sair",
        danger: true,
      });
      if (leave) {
        approved.current = true;
        onDiscard();
      }
      return leave;
    };
    guardRef.current = ask;
    const unload = (event: BeforeUnloadEvent) => {
      if (approved.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    type NavigationEvent = Event & {
      navigationType: string;
      destination: { key: string };
      canIntercept: boolean;
    };
    const navigation = (
      window as unknown as {
        navigation?: EventTarget & { traverseTo: (key: string) => unknown };
      }
    ).navigation;
    const traverse = (event: Event) => {
      const e = event as NavigationEvent;
      if (
        e.navigationType !== "traverse" ||
        !e.cancelable ||
        !e.canIntercept ||
        approved.current
      )
        return;
      e.preventDefault();
      void ask().then((leave) => {
        if (leave) navigation?.traverseTo(e.destination.key);
      });
    };
    window.addEventListener("beforeunload", unload);
    navigation?.addEventListener("navigate", traverse);
    return () => {
      if (guardRef.current === ask) guardRef.current = null;
      window.removeEventListener("beforeunload", unload);
      navigation?.removeEventListener("navigate", traverse);
    };
  }, [dirty, busy, confirm, guardRef, onDiscard]);
}
