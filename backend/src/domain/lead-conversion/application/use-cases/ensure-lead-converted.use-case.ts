import { Injectable, Logger } from "@nestjs/common";
import { LeadConversionRepository } from "../repositories/lead-conversion.repository";
import { ConvertLeadToOrganizationUseCase } from "./convert-lead-to-organization.use-case";

export interface EnsureLeadConvertedInput {
  leadId: string;
  requesterId: string;
  requesterRole: string;
}

/**
 * Garante que exista a organização correspondente a um lead, convertendo-o se preciso.
 *
 * Um lead que comprou não é mais um prospect. Enquanto ele continua lead, o CRM segue
 * oferecendo o cliente para prospecção e o negócio fica sem organização — e sem organização
 * o financeiro descarta o contrato em silêncio (ver SyncDealToFinanceUseCase).
 *
 * Nunca lança e nunca devolve erro: quem chama está no meio de uma venda, e a venda é fato
 * do usuário. Falhar aqui não pode custar o fechamento do negócio; devolve null e registra.
 */
@Injectable()
export class EnsureLeadConvertedUseCase {
  private readonly logger = new Logger(EnsureLeadConvertedUseCase.name);

  constructor(
    private readonly repo: LeadConversionRepository,
    private readonly convert: ConvertLeadToOrganizationUseCase,
  ) {}

  async execute(input: EnsureLeadConvertedInput): Promise<string | null> {
    try {
      // Idempotência: um segundo negócio ganho no mesmo lead reaproveita o cliente que já
      // existe, em vez de duplicar a organização aqui e o centro de custo no financeiro.
      const existente = await this.repo.findConvertedOrganizationId(input.leadId);
      if (existente) return existente;

      const result = await this.convert.execute(input);
      if (result.isLeft()) {
        this.logger.warn(
          `Não foi possível converter o lead ${input.leadId}: ${result.value.message}`,
        );
        return null;
      }

      return result.value.organizationId;
    } catch (error) {
      this.logger.error(
        `Falha ao converter o lead ${input.leadId}: ${(error as Error).message}`,
      );
      return null;
    }
  }
}
