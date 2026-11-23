import { ArrowLeftRight } from "lucide-react";

/**
 * Botão que leva à outra empresa. Cada negócio é uma instância própria (banco e
 * login separados), então trocar é abrir o outro site — o navegador guarda a sessão
 * de cada domínio, então não exige relogar.
 *
 * Só aparece quando a URL da outra instância está configurada. Antes da RDS existir,
 * o botão simplesmente não é renderizado, em vez de levar a um endereço quebrado.
 */
const BRAND = process.env.NEXT_PUBLIC_BRAND === "rds" ? "rds" : "wb";

const OUTRA = {
  wb: {
    nome: "RDS Transportes",
    curto: "RDS",
    url: process.env.NEXT_PUBLIC_URL_RDS,
    cor: "#e64d00", // laranja da RDS: a pista visual do destino
  },
  rds: {
    nome: "WB Digital Solutions",
    curto: "WB",
    url: process.env.NEXT_PUBLIC_URL_WB,
    cor: "#a03bb8", // roxo da WB
  },
}[BRAND];

export function BrandSwitcher() {
  if (!OUTRA.url) return null;

  return (
    <a
      href={OUTRA.url}
      title={`Ir para ${OUTRA.nome}`}
      aria-label={`Ir para ${OUTRA.nome}`}
      className="hidden sm:flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80"
      style={{ borderColor: OUTRA.cor, color: OUTRA.cor }}
    >
      <ArrowLeftRight className="h-3.5 w-3.5" />
      {OUTRA.curto}
    </a>
  );
}
