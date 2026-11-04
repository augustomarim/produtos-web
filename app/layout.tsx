import type { Metadata } from "next";
import "./globals.css";
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
      <body>{children}</body>
    </html>
  );
}
