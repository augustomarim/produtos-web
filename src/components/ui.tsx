import Link from "next/link";
import type { ReactNode } from "react";

export function Icon({
  name,
  size = 18,
}: {
  name:
    | "box"
    | "plus"
    | "refresh"
    | "logout"
    | "search"
    | "edit"
    | "trash"
    | "arrow"
    | "image"
    | "check"
    | "clock";
  size?: number;
}) {
  const paths: Record<typeof name, ReactNode> = {
    box: (
      <>
        <path d="m12 3 9 5-9 5-9-5 9-5Z" />
        <path d="M3 8v9l9 5 9-5V8M12 13v9M7.5 5.5l9 5" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    refresh: (
      <>
        <path d="M20 7v5h-5M4 17v-5h5" />
        <path d="M6 7a7 7 0 0 1 12-1l2 3M4 15l2 3a7 7 0 0 0 12-1" />
      </>
    ),
    logout: (
      <>
        <path d="M9 4H4v16h5M14 8l4 4-4 4M9 12h12" />
      </>
    ),
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 5 5" />
      </>
    ),
    edit: (
      <>
        <path d="m14 5 5 5M4 20l5-1L20 8a2 2 0 0 0-5-5L4 14v6Z" />
      </>
    ),
    trash: (
      <>
        <path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7" />
      </>
    ),
    arrow: <path d="m10 5-7 7 7 7M3 12h18" />,
    image: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <circle cx="8" cy="8" r="1.5" />
        <path d="m3 17 5-5 4 4 4-5 5 6" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
export function Spinner() {
  return <span className="spinner" aria-hidden="true" />;
}
export function Header() {
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link href="/produtos" className="brand">
          <span className="brand-mark">
            <Icon name="box" size={24} />
          </span>
          <span>
            Produtos
            <span className="brand-caption">SEU CATÁLOGO, ORGANIZADO</span>
          </span>
        </Link>
        <span className="header-label">Gestão de catálogo</span>
      </div>
    </header>
  );
}
export function Shell({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      <main className="app-main">{children}</main>
      <footer className="site-footer">
        Catálogo de produtos <span>·</span> Simples de organizar, fácil de
        encontrar.
      </footer>
    </>
  );
}
export function ProductSkeleton() {
  return (
    <div
      className="skeleton-list"
      role="status"
      aria-label="Carregando produtos"
    >
      <span className="sr-only">Carregando produtos…</span>
      {[0, 1, 2, 3].map((n) => (
        <div className="skeleton-row" key={n}>
          <span className="skeleton skeleton-photo" />
          <div>
            <span className="skeleton skeleton-title" />
            <span className="skeleton skeleton-code" />
          </div>
          <span className="skeleton skeleton-date" />
        </div>
      ))}
    </div>
  );
}
