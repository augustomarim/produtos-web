import type { Metadata } from "next";
import "./globals.css";
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
        <FeedbackProvider>{children}</FeedbackProvider>
      </body>
    </html>
  );
}
