import type { CampaignSend as PrismaSend } from "@prisma/client";
import { CampaignSend } from "@/domain/campaigns/enterprise/entities/campaign-send";
import { UniqueEntityID } from "@/core/unique-entity-id";
import type { SendStatus } from "@/domain/campaigns/enterprise/entities/campaign-send";

export class CampaignSendMapper {
  static toDomain(raw: PrismaSend): CampaignSend {
    return CampaignSend.create(
      {
        campaignId: raw.campaignId,
        phone: raw.phone,
        leadId: raw.leadId ?? undefined,
        status: raw.status as SendStatus,
        currentStep: raw.currentStep,
        scheduledAt: raw.scheduledAt ?? undefined,
        startedAt: raw.startedAt ?? undefined,
        finishedAt: raw.finishedAt ?? undefined,
        errorMessage: raw.errorMessage ?? undefined,
      },
      new UniqueEntityID(raw.id),
    );
  }

  static toPrisma(send: CampaignSend): PrismaSend {
    return {
      id: send.id.toString(),
      campaignId: send.campaignId,
      phone: send.phone,
      leadId: send.leadId ?? null,
      status: send.status,
      currentStep: send.currentStep,
      scheduledAt: send.scheduledAt ?? null,
      startedAt: send.startedAt ?? null,
      finishedAt: send.finishedAt ?? null,
      errorMessage: send.errorMessage ?? null,
    };
  }
}
