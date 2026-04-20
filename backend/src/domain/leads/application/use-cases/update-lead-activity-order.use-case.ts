import { Injectable } from "@nestjs/common";
import { left, right, type Either } from "@/core/either";
import { LeadsRepository } from "../repositories/leads.repository";

@Injectable()
export class UpdateLeadActivityOrderUseCase {
  constructor(private readonly leads: LeadsRepository) {}

  async execute(input: {
    leadId: string;
    activityIds: string[];
    requesterId: string;
    requesterRole: string;
  }): Promise<Either<Error, void>> {
    if (input.activityIds.length === 0) {
      return left(new Error("Lista de atividades não pode ser vazia"));
    }

    const lead = await this.leads.findByIdRaw(input.leadId);
    if (!lead) return left(new Error("Lead não encontrado"));

    if (input.requesterRole !== "admin" && lead.ownerId !== input.requesterId) {
      return left(new Error("Não autorizado"));
    }

    lead.update({ activityOrder: JSON.stringify(input.activityIds) });
    await this.leads.save(lead);
    return right(undefined);
  }
}

@Injectable()
export class ResetLeadActivityOrderUseCase {
  constructor(private readonly leads: LeadsRepository) {}

  async execute(input: {
    leadId: string;
    requesterId: string;
    requesterRole: string;
  }): Promise<Either<Error, void>> {
    const lead = await this.leads.findByIdRaw(input.leadId);
    if (!lead) return left(new Error("Lead não encontrado"));

    if (input.requesterRole !== "admin" && lead.ownerId !== input.requesterId) {
      return left(new Error("Não autorizado"));
    }

    lead.update({ activityOrder: undefined });
    await this.leads.save(lead);
    return right(undefined);
  }
}
