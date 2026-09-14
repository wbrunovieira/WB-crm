/**
 * Decide qual JID usar para identificar o contato.
 *
 * O WhatsApp esta migrando de JID por telefone (`5524...@s.whatsapp.net`) para LID
 * (`102138684420250@lid`) — um identificador estavel que NAO contem o numero. Quando o
 * remoteJid vem como LID, o Evolution manda o telefone verdadeiro em `remoteJidAlt`.
 *
 * Ignorar esse campo e o tipo de dependencia que quebra sozinha e em silencio: HTTP 200, a
 * mensagem descartada por "No phone match found", e nenhum sinal de erro. Foi assim que um
 * audio do Bruno sumiu em 14/09/2026 — la a causa era outra (cadastro com um digito a menos),
 * mas o mesmo caminho ja estava pronto para falhar de novo quando o LID virar padrao.
 */
export function resolverJid(input: {
  remoteJid?: string | null;
  remoteJidAlt?: string | null;
}): string {
  const principal = input.remoteJid ?? "";
  const alternativo = input.remoteJidAlt ?? "";

  // Grupo nunca tem telefone. Trocar pela alternativa aqui vincularia a conversa de grupo ao
  // contato de quem falou — mensagem no cliente errado e pior que mensagem sem vinculo.
  if (principal.endsWith("@g.us")) return principal;

  // So troca quando o principal e LID E existe alternativa: sem ela, tentar com o LID ainda
  // pode casar por outro criterio, e descartar seria perda garantida.
  if (principal.endsWith("@lid") && alternativo) return alternativo;

  return principal;
}
