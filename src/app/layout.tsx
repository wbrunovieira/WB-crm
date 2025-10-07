import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WB CRM - Gestão de Pipeline de Vendas",
  description: "Sistema de CRM focado em gestão de pipeline de vendas",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
