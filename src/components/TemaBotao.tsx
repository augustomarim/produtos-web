"use client";

export default function TemaBotao() {
  function alternar() {
    const raiz = document.documentElement;
    const atual = raiz.dataset.tema ??
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const proximo = atual === "dark" ? "light" : "dark";
    raiz.dataset.tema = proximo;
    try {
      localStorage.setItem("produtos-tema", proximo);
    } catch {
      // O tema continua ativo nesta página se o armazenamento estiver indisponível.
    }
  }

  return (
    <button type="button" className="tema-botao" onClick={alternar}>
      <span className="tema-claro">
        <span className="sr-only">Ativar modo claro</span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.4 1.4m11.2 11.2L19 19M19 5l-1.4 1.4M6.4 17.6 5 19" />
        </svg>
      </span>
      <span className="tema-escuro">
        <span className="sr-only">Ativar modo escuro</span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20.9 13.3A9 9 0 0 1 10.7 3.1 9 9 0 1 0 20.9 13.3Z" />
        </svg>
      </span>
    </button>
  );
}
