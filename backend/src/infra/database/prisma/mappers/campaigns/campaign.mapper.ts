import type {
  Campaign as PrismaCampaign,
  CampaignStep as PrismaStep,
} from "@prisma/client";
import { Campaign } from "@/domain/campaigns/enterprise/entities/campaign";
import { CampaignStep } from "@/domain/campaigns/enterprise/entities/campaign-step";
import { UniqueEntityID } from "@/core/unique-entity-id";
import type { CampaignStatus } from "@/domain/campaigns/enterprise/entities/campaign";
import type { StepType } from "@/domain/campaigns/enterprise/entities/campaign-step";

type PrismaCampaignWithSteps = PrismaCampaign & { steps?: PrismaStep[] };

export class CampaignMapper {
  static toDomain(raw: PrismaCampaignWithSteps): Campaign {
    const steps = (raw.steps ?? []).map((s) =>
      CampaignStep.create(
        {
          campaignId: s.campaignId,
          order: s.order,
          type: s.type as StepType,
          text: s.text ?? undefined,
          mediaUrl: s.mediaUrl ?? undefined,
          mediaCaption: s.mediaCaption ?? undefined,
          mediaType: s.mediaType ?? undefined,
          delaySeconds: s.delaySeconds ?? undefined,
          typingSeconds: s.typingSeconds ?? undefined,
        },
        new UniqueEntityID(s.id),
      ),
    );

    return Campaign.create(
      {
        ownerId: raw.ownerId,
        name: raw.name,
        instanceName: raw.instanceName,
        description: raw.description ?? undefined,
        status: raw.status as CampaignStatus,
        antiBlockConfig: raw.antiBlockConfig ?? undefined,
        steps,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
      },
      new UniqueEntityID(raw.id),
    );
  }

  static toPrisma(campaign: Campaign): PrismaCampaign {
    return {
      id: campaign.id.toString(),
      ownerId: campaign.ownerId,
      name: campaign.name,
      instanceName: campaign.instanceName,
      description: campaign.description ?? null,
      status: campaign.status,
      antiBlockConfig: campaign.antiBlockConfig ?? null,
      createdAt: campaign.createdAt,
      updatedAt: campaign.updatedAt,
    };
  }
}
