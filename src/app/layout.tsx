import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WB CRM - Gestão de Pipeline de Vendas",
  description: "Sistema de CRM focado em gestão de pipeline de vendas",
  icons: {
    icon: "/favicon.svg",
  },
  // Internal tool — nothing here (including /login) should ever be indexed.
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Identidade visual por negócio (WB roxo / RDS azul-laranja), ver globals.css.
  const brand = process.env.NEXT_PUBLIC_BRAND === "rds" ? "rds" : "wb";
  return (
    <html lang="pt-BR" data-brand={brand}>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
