/**
 * Diagnostico da conexao Google.
 *
 * Existe por causa de 25/08/2026: o refresh token foi revogado, o cron falhou de 5 em 5 minutos
 * por 19 dias (1835 erros), a tela de admin continuou dizendo "Conectada" e ninguem soube. Ao
 * investigar, o container ja havia reiniciado e os logs do periodo nao existiam mais — a causa
 * ficou indeterminavel.
 */

/** Dias entre um aviso e o proximo, quando a conexao segue quebrada. */
const DIAS_ENTRE_LEMBRETES = 7;

/**
 * Avisa na primeira falha e depois so semanalmente.
 *
 * Avisar a cada ciclo daria 1835 avisos para uma causa unica, e alarme que sempre toca ensina a
 * ignorar alarme. Nao avisar nunca mais foi o que deixou 19 dias passarem.
 */
export function deveAvisar(token: { failureNotifiedAt: Date | null }): boolean {
  if (!token.failureNotifiedAt) return true;
  const diasDesdeAviso = (Date.now() - token.failureNotifiedAt.getTime()) / 86_400_000;
  return diasDesdeAviso >= DIAS_ENTRE_LEMBRETES;
}

/**
 * Idade do REFRESH token, da conexao ate a falha.
 *
 * Precisa ser medida a partir do consentimento, e nao de updatedAt: este ultimo muda a cada
 * renovacao de access token e faria todo token parecer recem-criado.
 */
export function idadeEmDias(connectedAt: Date | null, quando: Date): number | null {
  if (!connectedAt) return null;
  return Math.round((quando.getTime() - connectedAt.getTime()) / 86_400_000);
}

/** Traduz a idade na hora da falha numa hipotese acionavel, em vez de deixar o proximo adivinhar. */
export function diagnostico(idadeDias: number | null): string {
  if (idadeDias === null) {
    return "Idade do token desconhecida — conectado antes desta instrumentação existir.";
  }
  if (idadeDias <= 9) {
    return `Token durou ${idadeDias} dias. Cerca de uma semana é a assinatura da tela de consentimento em modo "Testing" no Google Cloud, que invalida o refresh token a cada 7 dias. Publicar o app resolve de vez; reconectar só compra mais uma semana.`;
  }
  return `Token durou ${idadeDias} dias — tempo demais para ser o limite semanal do app não publicado. Causa provável: troca de senha da conta Google, revogação manual em myaccount.google.com → Segurança → Acessos de terceiros, ou limite de refresh tokens por cliente (o mais antigo é descartado).`;
}
