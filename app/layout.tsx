import { Suspense } from "react";
import type { Metadata } from "next";
import "./globals.css";
import NotificacoesTempoReal from "../src/components/NotificacoesTempoReal";
import SessionSync from "../src/components/SessionSync";
import { FeedbackProvider } from "../src/components/Feedback";
const inicializarTema = `try {
  const tema = localStorage.getItem("produtos-tema");
  if (tema === "dark" || tema === "light") document.documentElement.dataset.tema = tema;
} catch {}`;

export const metadata: Metadata = {
  title: "Produtos | Seu catálogo organizado",
  description: "Cadastre, acompanhe e organize seus produtos com fotos.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: inicializarTema }} />
      </head>
      <body>
        <SessionSync />
        <FeedbackProvider>
          <Suspense fallback={null}>
            <NotificacoesTempoReal />
          </Suspense>
          {children}
        </FeedbackProvider>
      </body>
    </html>
  );
}
