import { Injectable } from "@nestjs/common";
import { left, right, type Either } from "@/core/either";
import { DealsRepository } from "../repositories/deals.repository";
import { Deal } from "../../enterprise/entities/deal";
import { DealTitle } from "../../enterprise/value-objects/deal-title.vo";

export interface CreateDealInput {
  ownerId: string;
  title: string;
  description?: string;
  value?: number;
  currency?: string;
  stageId: string;
  contactId?: string;
  organizationId?: string;
  leadId?: string;
  partnerId?: string;
  referredByPartnerId?: string;
  expectedCloseDate?: Date;
}

type Output = Either<Error, { deal: Deal }>;

@Injectable()
export class CreateDealUseCase {
  constructor(private readonly deals: DealsRepository) {}

  async execute(input: CreateDealInput): Promise<Output> {
    const titleResult = DealTitle.create(input.title);
    if (titleResult.isLeft()) return left(titleResult.value);
    if (!input.stageId?.trim()) return left(new Error("Etapa do deal é obrigatória"));

    const stage = await this.deals.findStageById(input.stageId);
    if (!stage) return left(new Error("Etapa não encontrada"));

    const deal = Deal.create({
      ownerId: input.ownerId,
      title: titleResult.value.value,
      description: input.description,
      value: input.value ?? 0,
      currency: input.currency ?? "BRL",
      status: "open",
      stageId: input.stageId,
      contactId: input.contactId,
      organizationId: input.organizationId,
      leadId: input.leadId,
      partnerId: input.partnerId,
      referredByPartnerId: input.referredByPartnerId,
      expectedCloseDate: input.expectedCloseDate,
    });

    await this.deals.save(deal);

    await this.deals.createStageHistory({
      dealId: deal.id.toString(),
      fromStageId: null,
      toStageId: input.stageId,
      changedById: input.ownerId,
    });

    return right({ deal });
  }
}
