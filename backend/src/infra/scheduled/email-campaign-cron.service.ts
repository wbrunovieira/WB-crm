import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PrismaService } from "@/infra/database/prisma.service";
import { SendCampaignStepUseCase } from "@/domain/email-campaigns/application/use-cases/send-campaign-step.use-case";

const TRACKING_BASE_URL = process.env.BACKEND_URL ?? "https://api.crm.wbdigitalsolutions.com";

@Injectable()
export class EmailCampaignCronService {
  private readonly logger = new Logger(EmailCampaignCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sendStep: SendCampaignStepUseCase,
  ) {}

  @Cron("0 9 * * *")
  async runSequenceStep() {
    this.logger.log("Running email campaign sequence step...");

    // Find all active campaigns
    const activeCampaigns = await this.prisma.emailCampaign.findMany({
      where: { status: "ACTIVE" },
      include: { steps: { orderBy: { order: "asc" } } },
    });

    for (const campaign of activeCampaigns) {
      for (const step of campaign.steps) {
        // Check if there are recipients waiting for this step whose delay has elapsed
        const dueRecipients = await this.prisma.emailCampaignRecipient.findMany({
          where: {
            campaignId: campaign.id,
            currentStep: step.order,
            status: { in: ["PENDING", "ACTIVE"] },
          },
          include: {
            sends: {
              where: { stepId: { not: undefined } },
              orderBy: { sentAt: "desc" },
              take: 1,
            },
          },
        });

        const now = new Date();
        const delayMs = step.delayDays * 24 * 60 * 60 * 1000;

        const hasDue = dueRecipients.some((r) => {
          if (step.order === 0) return true; // first step always due
          const lastSend = r.sends[0];
          if (!lastSend) return true;
          return now.getTime() - lastSend.sentAt.getTime() >= delayMs;
        });

        if (hasDue) {
          try {
            await this.sendStep.execute({
              campaignId: campaign.id,
              stepOrder: step.order,
              trackingBaseUrl: TRACKING_BASE_URL,
            });
            this.logger.log(`Campaign ${campaign.id} step ${step.order}: sent`);
          } catch (err) {
            this.logger.error(`Campaign ${campaign.id} step ${step.order} error: ${err}`);
          }
        }
      }
    }
  }
}
