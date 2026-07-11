import { Injectable } from "@nestjs/common";
import { left, right, type Either } from "@/core/either";
import { DealsRepository } from "../repositories/deals.repository";
import { Deal } from "../../enterprise/entities/deal";
import { DealTitle } from "../../enterprise/value-objects/deal-title.vo";
import { PartnerOwnershipValidator } from "@/domain/partners/application/services/partner-ownership.validator";

export interface CreateDealInput {
  ownerId: string;
  requesterRole?: string;
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
  constructor(
    private readonly deals: DealsRepository,
    private readonly partnerOwnership: PartnerOwnershipValidator,
  ) {}

  async execute(input: CreateDealInput): Promise<Output> {
    const titleResult = DealTitle.create(input.title);
    if (titleResult.isLeft()) return left(titleResult.value);
    if (!input.stageId?.trim()) return left(new Error("Etapa do deal é obrigatória"));

    // A partner cannot be both the client and the referrer of the same deal.
    if (input.partnerId && input.partnerId === input.referredByPartnerId) {
      return left(new Error("O mesmo parceiro não pode ser cliente e indicador do mesmo negócio"));
    }

    // The FK only proves existence; ensure the requester actually owns each partner.
    const role = input.requesterRole ?? "sdr";
    const partnerCheck = await this.partnerOwnership.assertAccessible(input.partnerId, input.ownerId, role);
    if (partnerCheck.isLeft()) return left(partnerCheck.value);
    const referrerCheck = await this.partnerOwnership.assertAccessible(input.referredByPartnerId, input.ownerId, role);
    if (referrerCheck.isLeft()) return left(referrerCheck.value);

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
