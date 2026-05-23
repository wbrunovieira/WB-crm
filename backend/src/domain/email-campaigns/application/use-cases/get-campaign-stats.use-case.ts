import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { EmailCampaignsRepository } from "../repositories/email-campaigns.repository";
import { EmailCampaignStepsRepository } from "../repositories/email-campaign-steps.repository";
import { EmailCampaignRecipientsRepository } from "../repositories/email-campaign-recipients.repository";
import { EmailCampaignSendsRepository } from "../repositories/email-campaign-sends.repository";

interface StepStats { order: number; subject: string; sent: number; opened: number; clicked: number; }
interface Output {
  campaignId: string;
  name: string;
  status: string;
  totalRecipients: number;
  steps: StepStats[];
}

@Injectable()
export class GetCampaignStatsUseCase {
  constructor(
    private readonly campaigns: EmailCampaignsRepository,
    private readonly steps: EmailCampaignStepsRepository,
    private readonly recipients: EmailCampaignRecipientsRepository,
    private readonly sends: EmailCampaignSendsRepository,
  ) {}

  async execute({ campaignId }: { campaignId: string }): Promise<Either<Error, Output>> {
    const campaign = await this.campaigns.findById(campaignId);
    if (!campaign) return left(new Error("Campaign not found"));

    const [allSteps, allRecipients] = await Promise.all([
      this.steps.findByCampaign(campaignId),
      this.recipients.findByCampaign(campaignId),
    ]);

    const stepStats = await Promise.all(
      allSteps.map(async (step) => {
        const counts = await this.sends.countByStep(step.id.toString());
        return { order: step.order, subject: step.subject, ...counts };
      }),
    );

    return right({
      campaignId,
      name: campaign.name,
      status: campaign.status,
      totalRecipients: allRecipients.length,
      steps: stepStats,
    });
  }
}
