/**
 * Logo do negócio ativo, escolhido por NEXT_PUBLIC_BRAND (ver globals.css e layout).
 * WB: símbolo roxo oficial. RDS: logo branco (bom sobre o azul-marinho do tema RDS).
 * Assets em /public/brand. Altura fixa, largura automática — serve proporções diferentes.
 */
const BRAND = process.env.NEXT_PUBLIC_BRAND === "rds" ? "rds" : "wb";

export function BrandLogo({ className = "" }: { className?: string }) {
  if (BRAND === "rds") {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src="/brand/rds-logo.png" alt="RDS Transportes" height={26} className={`h-[26px] w-auto ${className}`} />;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/brand/wb-logo.svg" alt="WB Digital Solutions" height={28} className={`h-7 w-auto ${className}`} />;
}
