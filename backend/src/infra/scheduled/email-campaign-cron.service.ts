import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PrismaService } from "@/infra/database/prisma.service";
import { TriggerCampaignSendNowUseCase } from "@/domain/email-campaigns/application/use-cases/trigger-campaign-send-now.use-case";

@Injectable()
export class EmailCampaignCronService {
  private readonly logger = new Logger(EmailCampaignCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly triggerSendNow: TriggerCampaignSendNowUseCase,
  ) {}

  @Cron("0 9 * * *")
  async runSequenceStep() {
    this.logger.log("Running email campaign sequence step...");

    const activeCampaigns = await this.prisma.emailCampaign.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true },
    });

    for (const campaign of activeCampaigns) {
      this.logger.log(`Triggering send for campaign ${campaign.id} (${campaign.name})`);
      const result = await this.triggerSendNow.execute({ campaignId: campaign.id });
      if (result.isLeft()) {
        this.logger.warn(`Campaign ${campaign.id} skipped: ${result.value.message}`);
      } else {
        this.logger.log(`Campaign ${campaign.id}: send triggered`);
      }
    }
  }
}
