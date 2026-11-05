"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Confirmation = {
  title: string;
  description: ReactNode;
  confirmLabel: string;
  danger?: boolean;
};
type Toast = { id: number; message: string; warning: boolean };
type Feedback = {
  notify: (message: string, warning?: boolean) => void;
  dismiss: () => void;
  confirm: (options: Confirmation) => Promise<boolean>;
  guardRef: React.MutableRefObject<null | (() => Promise<boolean>)>;
};
const Context = createContext<Feedback | null>(null);
export function useFeedback() {
  const value = useContext(Context);
  if (!value) throw new Error("FeedbackProvider ausente");
  return value;
}
export function Modal({
  title,
  children,
  onClose,
  className = "",
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current!;
    const previous = document.activeElement as HTMLElement | null;
    dialog.showModal();
    return () => {
      dialog.close();
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`app-dialog ${className}`}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          const r = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            onClose();
        }
      }}
    >
      <h2 id={titleId}>{title}</h2>
      {children}
    </dialog>
  );
}
function ToastNotice({
  value,
  dismiss,
}: {
  value: Toast;
  dismiss: () => void;
}) {
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (value.warning || paused) return;
    const timer = setTimeout(dismiss, 6500);
    return () => clearTimeout(timer);
  }, [value, paused, dismiss]);
  return (
    <div
      className={`toast notice ${value.warning ? "notice-warning" : "notice-success"}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setPaused(false);
      }}
    >
      <span role="status">{value.message}</span>
      <button
        type="button"
        className="text-button"
        onClick={dismiss}
        aria-label="Fechar aviso"
      >
        ×
      </button>
    </div>
  );
}
export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);
  const guardRef = useRef<null | (() => Promise<boolean>)>(null);
  const notify = useCallback(
    (message: string, warning = false) =>
      setToast({ id: Date.now(), message, warning }),
    [],
  );
  const dismiss = useCallback(() => setToast(null), []);
  const confirm = useCallback((options: Confirmation) => {
    if (resolver.current) return Promise.resolve(false);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
      setConfirmation(options);
    });
  }, []);
  function finish(value: boolean) {
    resolver.current?.(value);
    resolver.current = null;
    setConfirmation(null);
  }
  return (
    <Context.Provider value={{ notify, dismiss, confirm, guardRef }}>
      {children}
      {toast && <ToastNotice key={toast.id} value={toast} dismiss={dismiss} />}
      {confirmation && (
        <Modal title={confirmation.title} onClose={() => finish(false)}>
          <div className="dialog-description">{confirmation.description}</div>
          <div className="dialog-actions">
            <button
              autoFocus
              type="button"
              className="button button-secondary"
              onClick={() => finish(false)}
            >
              Cancelar
            </button>
            <button
              type="button"
              className={`button ${confirmation.danger ? "button-danger-solid" : "button-primary"}`}
              onClick={() => finish(true)}
            >
              {confirmation.confirmLabel}
            </button>
          </div>
        </Modal>
      )}
    </Context.Provider>
  );
}
export function GuardedLink({
  href,
  onNavigate,
  ...props
}: React.ComponentProps<typeof Link>) {
  const { guardRef } = useFeedback();
  const router = useRouter();
  return (
    <Link
      {...props}
      href={href}
      onNavigate={(e) => {
        onNavigate?.(e);
        if (guardRef.current) {
          e.preventDefault();
          void guardRef.current().then((leave) => {
            if (leave) router.push(String(href));
          });
        }
      }}
    />
  );
}
