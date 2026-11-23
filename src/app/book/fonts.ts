import localFont from "next/font/local";

/**
 * Fontes das páginas públicas de agendamento, auto-hospedadas.
 *
 * Por que não `next/font/google`: ele busca a fonte no Google em TEMPO DE BUILD, e
 * três famílias em paralelo esbarram no limite por IP — o build falha com
 * "An error occurred in next/font: Cannot read properties of null" de forma
 * intermitente, sem nada a ver com o código. Quebrou o CI e o build do servidor
 * no mesmo dia (23/11/2026). Com os arquivos no repo, o build não depende de rede.
 *
 * São as fontes variáveis, então um arquivo por família cobre toda a faixa de pesos.
 * Ambas são OFL 1.1 (ver fonts/OFL-NOTICE.md).
 */
export const display = localFont({
  src: "./fonts/BricolageGrotesque-Variable.woff2",
  weight: "400 800",
  variable: "--font-display",
  display: "swap",
});

export const body = localFont({
  src: "./fonts/HankenGrotesk-Variable.woff2",
  weight: "400 700",
  variable: "--font-body",
  display: "swap",
});
