/**
 * Aviso de queda de integracao — o que faltou em duas quedas reais.
 *
 * Google ficou fora 19 dias (1835 erros, tela dizendo "Conectada") e GoTo ficou fora 39 dias
 * (tela dizendo "Token expirado", corretamente). A do GoTo e a licao mais dura: a tela estava
 * CERTA e nao adiantou nada, porque ninguem abre tela de admin para conferir se esta tudo bem.
 * Informacao que existe e nao e entregue nao informa.
 *
 * Custo: tres semanas de ligacoes perdidas, sem transcricao nem analise, e a API do GoTo nao
 * devolve esse periodo retroativamente.
 */

const DIAS_ENTRE_LEMBRETES = 7;

export type Integracao = "google" | "goto";

/** Notifica na primeira falha e depois so semanalmente. */
export function deveNotificar(ultimoAvisoEm: Date | null): boolean {
  if (!ultimoAvisoEm) return true;
  return (Date.now() - ultimoAvisoEm.getTime()) / 86_400_000 >= DIAS_ENTRE_LEMBRETES;
}

const CONSEQUENCIA: Record<Integracao, { nome: string; perde: string; pagina: string }> = {
  google: {
    nome: "Google",
    perde: "e-mail não sincroniza, gravações de reunião (Meet) não são detectadas e propostas não sobem para o Drive",
    pagina: "/admin/google",
  },
  goto: {
    nome: "GoTo Connect",
    perde: "ligações não entram no CRM, e sem elas não há gravação, transcrição nem análise da conversa",
    pagina: "/admin/goto",
  },
};

/**
 * Monta o aviso em termos de CONSEQUENCIA, nao de sintoma tecnico.
 *
 * "Token expirado" e verdadeiro e inutil: nao diz o que parou nem o que se perde a cada dia.
 * Foi exatamente a mensagem que ficou 39 dias na tela do GoTo sem provocar acao.
 */
export function montarAviso(integracao: Integracao, diasQuebrado: number) {
  const { nome, perde, pagina } = CONSEQUENCIA[integracao];
  const tempo =
    diasQuebrado <= 0 ? "agora" : diasQuebrado === 1 ? "há 1 dia" : `há ${diasQuebrado} dias`;

  return {
    type: "integration_down",
    status: "error",
    title: `Integração ${nome} caiu`,
    summary: `Sem conexão ${tempo}: ${perde}. Reconecte em ${pagina} — o que passa nesse período não volta depois.`,
  };
}
