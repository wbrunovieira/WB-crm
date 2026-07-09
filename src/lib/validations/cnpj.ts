/**
 * Utilitários de validação e normalização de CNPJ.
 *
 * Suporta o CNPJ **alfanumérico** da Receita Federal (Nota Técnica COCAD/SUARA/RFB
 * nº 49/2024, em vigor a partir de jul/2026): 12 primeiras posições alfanuméricas
 * (A-Z, 0-9) + 2 dígitos verificadores numéricos. O CNPJ numérico tradicional
 * continua válido (é um caso particular).
 *
 * No cálculo do DV, cada caractere vale (código ASCII − 48): '0'-'9' → 0-9,
 * 'A'=17, 'B'=18 … 'Z'=42. Os pesos e o módulo 11 são os mesmos do CNPJ numérico.
 */

/** Remove pontuação, mantém letras/dígitos, uppercase e normaliza para 14 posições */
export function normalizeCNPJ(cnpj: string): string {
  return cnpj.replace(/[^0-9A-Za-z]/g, "").toUpperCase().padStart(14, "0");
}

/** Formata 14 posições como XX.XXX.XXX/XXXX-XX (funciona p/ numérico e alfanumérico) */
export function formatCNPJ(cnpj: string): string {
  const d = normalizeCNPJ(cnpj);
  if (d.length !== 14) return cnpj;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

/** Valor do caractere para o cálculo do DV: código ASCII − 48 ('0'→0 … 'A'→17 … 'Z'→42) */
function charValue(ch: string): number {
  return ch.charCodeAt(0) - 48;
}

/** Valida CNPJ (numérico ou alfanumérico) pelo algoritmo dos dígitos verificadores */
export function validateCNPJ(cnpj: string): boolean {
  const d = normalizeCNPJ(cnpj);

  // 12 posições alfanuméricas [0-9A-Z] + 2 dígitos verificadores numéricos.
  if (!/^[0-9A-Z]{12}\d{2}$/.test(d)) return false;

  // Rejeita CNPJ numérico com todos os dígitos iguais (00000000000000, …).
  if (/^(\d)\1{13}$/.test(d)) return false;

  function calcDigit(chars: string, weights: number[]): number {
    const sum = chars
      .split("")
      .reduce((acc, ch, i) => acc + charValue(ch) * weights[i], 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  }

  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  const digit1 = calcDigit(d.slice(0, 12), w1);
  const digit2 = calcDigit(d.slice(0, 13), w2);

  return parseInt(d[12], 10) === digit1 && parseInt(d[13], 10) === digit2;
}
