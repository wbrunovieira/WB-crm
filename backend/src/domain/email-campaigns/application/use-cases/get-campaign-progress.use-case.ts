import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { PrismaService } from "@/infra/database/prisma.service";
import { EmailCampaignsRepository } from "../repositories/email-campaigns.repository";
import { EmailCampaignStepsRepository } from "../repositories/email-campaign-steps.repository";
import { EmailCampaignRecipientsRepository } from "../repositories/email-campaign-recipients.repository";
import { EmailCampaignSendsRepository } from "../repositories/email-campaign-sends.repository";
import { sendingInProgress } from "./trigger-campaign-send-now.use-case";

export interface RecipientProgress {
  id: string;
  email: string;
  name?: string;
  company?: string;
  status: string;
  currentStep: number;
  stepsSent: number[];
  lastSentAt?: Date;
  openedAt?: Date;
  clickedAt?: Date;
  clickedUrl?: string;
}

export interface CampaignProgressOutput {
  campaignId: string;
  totalRecipients: number;
  totalSteps: number;
  sendingInProgress: boolean;
  recipients: RecipientProgress[];
}

interface Input {
  campaignId: string;
}

@Injectable()
export class GetCampaignProgressUseCase {
  constructor(
    private readonly campaigns: EmailCampaignsRepository,
    private readonly recipientsRepo: EmailCampaignRecipientsRepository,
    private readonly sendsRepo: EmailCampaignSendsRepository,
    private readonly stepsRepo: EmailCampaignStepsRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(input: Input): Promise<Either<Error, CampaignProgressOutput>> {
    const { campaignId } = input;

    const campaign = await this.campaigns.findById(campaignId);
    if (!campaign) return left(new Error("Campaign not found"));

    const [recipients, allSteps] = await Promise.all([
      this.recipientsRepo.findByCampaign(campaignId),
      this.stepsRepo.findByCampaign(campaignId),
    ]);

    // Build a map of stepId → stepOrder using Prisma for efficiency
    const stepRows = await this.prisma.emailCampaignStep.findMany({
      where: { campaignId },
      select: { id: true, order: true },
    });
    const stepOrderMap = new Map<string, number>(stepRows.map((s) => [s.id, s.order]));

    // For each recipient, fetch their sends and resolve step orders
    const recipientProgresses: RecipientProgress[] = await Promise.all(
      recipients.map(async (recipient) => {
        const sends = await this.sendsRepo.findByRecipient(recipient.id.toString());

        const stepsSent: number[] = [];
        let lastSentAt: Date | undefined;
        let openedAt: Date | undefined;
        let clickedAt: Date | undefined;
        let clickedUrl: string | undefined;

        for (const send of sends) {
          const order = stepOrderMap.get(send.stepId);
          if (order !== undefined) stepsSent.push(order);
          if (!lastSentAt || send.sentAt > lastSentAt) lastSentAt = send.sentAt;
          if (send.openedAt && (!openedAt || send.openedAt < openedAt)) openedAt = send.openedAt;
          if (send.clickedAt && (!clickedAt || send.clickedAt < clickedAt)) {
            clickedAt = send.clickedAt;
            clickedUrl = send.clickedUrl;
          }
        }

        stepsSent.sort((a, b) => a - b);

        return {
          id: recipient.id.toString(),
          email: recipient.email,
          name: recipient.name,
          company: recipient.company,
          status: recipient.status,
          currentStep: recipient.currentStep,
          stepsSent,
          lastSentAt,
          openedAt,
          clickedAt,
          clickedUrl,
        };
      }),
    );

    // Sort: completed first, then active, then pending/others
    const statusOrder: Record<string, number> = {
      COMPLETED: 0,
      ACTIVE: 1,
      PENDING: 2,
      BOUNCED: 3,
      UNSUBSCRIBED: 4,
    };
    recipientProgresses.sort(
      (a, b) => (statusOrder[a.status] ?? 5) - (statusOrder[b.status] ?? 5),
    );

    return right({
      campaignId,
      totalRecipients: recipients.length,
      totalSteps: allSteps.length,
      sendingInProgress: sendingInProgress.has(campaignId),
      recipients: recipientProgresses,
    });
  }
}
