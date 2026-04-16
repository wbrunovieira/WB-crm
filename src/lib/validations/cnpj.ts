/**
 * Utilitários de validação e normalização de CNPJ.
 * Normalização: remove pontuação → 14 dígitos puros.
 * Validação: verifica dígitos verificadores (algoritmo oficial).
 */

/** Remove qualquer caractere não-numérico */
export function normalizeCNPJ(cnpj: string): string {
  return cnpj.replace(/\D/g, "");
}

/** Formata 14 dígitos como XX.XXX.XXX/XXXX-XX */
export function formatCNPJ(cnpj: string): string {
  const d = normalizeCNPJ(cnpj);
  if (d.length !== 14) return cnpj;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

/** Valida CNPJ pelo algoritmo dos dígitos verificadores */
export function validateCNPJ(cnpj: string): boolean {
  const d = normalizeCNPJ(cnpj);

  if (d.length !== 14) return false;

  // Rejeita sequências de dígitos iguais (00000000000000, 11111111111111, …)
  if (/^(\d)\1+$/.test(d)) return false;

  function calcDigit(digits: string, weights: number[]): number {
    const sum = digits
      .split("")
      .reduce((acc, ch, i) => acc + parseInt(ch) * weights[i], 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  }

  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  const digit1 = calcDigit(d.slice(0, 12), w1);
  const digit2 = calcDigit(d.slice(0, 13), w2);

  return parseInt(d[12]) === digit1 && parseInt(d[13]) === digit2;
}
