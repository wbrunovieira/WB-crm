import { Injectable, Logger } from "@nestjs/common";
import { FinanceSyncPort } from "../ports/finance-sync.port";

export interface SyncDealInput {
  id: string;
  title: string;
  value: number | null;
  currency: string;
  status: string;
  closedAt: Date | null;
  updatedAt: Date;
  organizationId: string | null;
  organizationName: string | null;
}

/**
 * Espelha o contrato no financeiro a cada mudança relevante do negócio.
 *
 * Dispara em QUALQUER mudança relevante, não apenas no "won": se só o fechamento disparasse,
 * uma venda que cai depois de fechada nunca chegaria lá e o razão ficaria com previsão de
 * caixa de uma receita que não vai existir — pior que previsão nenhuma, porque passa
 * despercebida por parecer normal.
 *
 * O CRM não interpreta nem filtra o estado: manda como está. Quem decide é o financeiro, pela
 * regra dele — lançamento confirmado é intocável, o resto vira divergência reportada.
 */
@Injectable()
export class SyncDealToFinanceUseCase {
  private readonly logger = new Logger(SyncDealToFinanceUseCase.name);

  constructor(private readonly finance: FinanceSyncPort) {}

  async execute(deal: SyncDealInput): Promise<void> {
    // Sem cliente não há centro de custo a criar do outro lado; mandar geraria contrato órfão.
    if (!deal.organizationId || !deal.organizationName) {
      this.logger.debug(`Negócio ${deal.id} sem organização — nada a sincronizar`);
      return;
    }

    try {
      await this.finance.syncContract({
        source: "wb-crm",
        deal: {
          id: deal.id,
          title: deal.title,
          totalValue: deal.value,
          currency: deal.currency,
          status: deal.status,
          closedAt: deal.closedAt ? deal.closedAt.toISOString() : null,
          updatedAt: deal.updatedAt.toISOString(),
        },
        organization: { id: deal.organizationId, name: deal.organizationName },
      });
    } catch (error) {
      // Efeito colateral: se o financeiro estiver fora, o CRM não pode recusar a edição do
      // usuário. A divergência é detectada lá, comparando estado — não impedida aqui.
      this.logger.error(
        `Falha ao sincronizar o negócio ${deal.id} com o financeiro: ${(error as Error).message}`,
      );
    }
  }
}
