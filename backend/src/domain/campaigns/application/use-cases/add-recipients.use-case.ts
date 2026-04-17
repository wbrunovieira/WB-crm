import { Injectable } from "@nestjs/common";
import { left, right, type Either } from "@/core/either";
import { CampaignsRepository } from "../repositories/campaigns.repository";
import { CampaignSendsRepository } from "../repositories/campaign-sends.repository";
import { CampaignSend } from "../../enterprise/entities/campaign-send";
import { PhoneNumber } from "../../enterprise/value-objects/phone-number";

interface RecipientInput {
  phone: string;
  leadId?: string;
}

interface Input {
  campaignId: string;
  ownerId: string;
  recipients: RecipientInput[];
}

type Output = Either<Error, { added: number; invalid: string[] }>;

@Injectable()
export class AddRecipientsUseCase {
  constructor(
    private readonly campaigns: CampaignsRepository,
    private readonly sends: CampaignSendsRepository,
  ) {}

  async execute({ campaignId, ownerId, recipients }: Input): Promise<Output> {
    const campaign = await this.campaigns.findById(campaignId);
    if (!campaign)                    return left(new Error("Campanha não encontrada"));
    if (campaign.ownerId !== ownerId) return left(new Error("Não autorizado"));
    if (campaign.status === "FINISHED") return left(new Error("Campanha finalizada"));

    const invalid: string[] = [];
    const toSave: CampaignSend[] = [];

    for (const r of recipients) {
      const result = PhoneNumber.create(r.phone);
      if (result.isLeft()) {
        invalid.push(r.phone);
        continue;
      }
      toSave.push(
        CampaignSend.create({
          campaignId,
          phone: result.value.toString(),
          leadId: r.leadId,
        }),
      );
    }

    if (toSave.length > 0) {
      await this.sends.saveMany(toSave);
    }

    return right({ added: toSave.length, invalid });
  }
}
