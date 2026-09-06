/**
 * Contrato com o serviço financeiro (calendar-finances).
 *
 * O CRM manda o ESTADO COMPLETO do contrato, nunca um delta — o mesmo payload serve para
 * criar e para reenviar depois de alteração, e reenviar o mesmo estado é inofensivo. Delta
 * obrigaria os dois lados a concordarem sobre o que já aconteceu, que é onde integração
 * apodrece.
 *
 * Sem parcelas de propósito: cronograma de pagamento tem vencimento e estado pago/não pago, e
 * o CRM não tem nenhum dos dois. O parcelamento nasce no financeiro, que é onde o formulário
 * de contrato vive. Duplicar o conceito criaria duas fontes de verdade para a mesma coisa.
 */
export interface FinanceContractPayload {
  source: "wb-crm";
  deal: {
    id: string;
    title: string;
    totalValue: number | null;
    currency: string;
    status: string;
    closedAt: string | null;
    /** Carimbo de ordenação: o destino descarta entrega mais velha que a última processada. */
    updatedAt: string;
  };
  organization: {
    id: string;
    name: string;
  };
}

export abstract class FinanceSyncPort {
  abstract syncContract(payload: FinanceContractPayload): Promise<void>;
}
