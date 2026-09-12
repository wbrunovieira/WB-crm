import { RecurringContract } from "../../enterprise/entities/recurring-contract";

export interface TotaisRecorrentes {
  /** O que o cliente paga — hospedagem MAIS dominio. E o numero que o Bruno fala ao cliente. */
  cobradoMensal: number;
  cobradoAnual: number;
  /** O que fica com a WB — exclui repasse (dominio). Este e o numero de receita. */
  receitaMensal: number;
  receitaAnual: number;
  /** Quanto passa sem ficar. Util para conferir contra o financeiro. */
  repasseAnual: number;
}

/**
 * Os dois totais existem porque servem a perguntas diferentes, e confundi-los engana nos dois
 * sentidos: falar ao cliente so a hospedagem cobra a menos; contar o dominio como receita faz a
 * recorrencia parecer maior do que e.
 *
 * Cortesia fica fora de ambos — servico que existe e nunca e cobrado nao e cobranca nem receita.
 * Cancelado e encerrado tambem, senao o total cresce com contrato morto.
 */
export function totalizar(contracts: RecurringContract[]): TotaisRecorrentes {
  const ativos = contracts.filter((c) => c.status === "ativo" && !c.isCourtesy);

  const mensal = (lista: RecurringContract[]) =>
    lista.reduce((soma, c) => soma + c.monthlyValue, 0);

  const cobradoMensal = mensal(ativos);
  const receitaMensal = mensal(ativos.filter((c) => !c.isPassThrough));
  const repasseMensal = mensal(ativos.filter((c) => c.isPassThrough));

  return {
    cobradoMensal,
    cobradoAnual: cobradoMensal * 12,
    receitaMensal,
    receitaAnual: receitaMensal * 12,
    repasseAnual: repasseMensal * 12,
  };
}
