import { Suspense } from "react";
import type { Metadata } from "next";
import "./globals.css";
import NotificacoesTempoReal from "../src/components/NotificacoesTempoReal";
import SessionSync from "../src/components/SessionSync";
import { FeedbackProvider } from "../src/components/Feedback";
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
    <html lang="pt-BR">
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
