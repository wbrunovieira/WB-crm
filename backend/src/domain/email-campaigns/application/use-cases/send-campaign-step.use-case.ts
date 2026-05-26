import { Injectable, Logger } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { EmailCampaignsRepository } from "../repositories/email-campaigns.repository";
import { EmailCampaignStepsRepository } from "../repositories/email-campaign-steps.repository";
import { EmailCampaignRecipientsRepository } from "../repositories/email-campaign-recipients.repository";
import { EmailCampaignSendsRepository } from "../repositories/email-campaign-sends.repository";
import { EmailCampaignSend } from "../../enterprise/entities/email-campaign-send.entity";
import { GmailPort } from "@/domain/integrations/email/application/ports/gmail.port";
import { VariableResolverService } from "../services/variable-resolver.service";
import { EmailSuppressionsRepository } from "../repositories/email-suppressions.repository";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface DelayRange {
  min: number;
  max: number;
}

interface Input {
  campaignId: string;
  stepOrder: number;
  trackingBaseUrl?: string;
  delayRange?: DelayRange;
}

interface Output {
  sent: number;
  failed: number;
  suppressed: number;
}

@Injectable()
export class SendCampaignStepUseCase {
  private readonly logger = new Logger(SendCampaignStepUseCase.name);

  constructor(
    private readonly campaigns: EmailCampaignsRepository,
    private readonly steps: EmailCampaignStepsRepository,
    private readonly recipients: EmailCampaignRecipientsRepository,
    private readonly sends: EmailCampaignSendsRepository,
    private readonly gmail: GmailPort,
    private readonly resolver: VariableResolverService,
    private readonly suppressions: EmailSuppressionsRepository,
  ) {}

  async execute(input: Input): Promise<Either<Error, Output>> {
    const campaign = await this.campaigns.findById(input.campaignId);
    if (!campaign) return left(new Error("Campaign not found"));
    if (campaign.status !== "ACTIVE") return left(new Error("Campaign is not active"));

    const allSteps = await this.steps.findByCampaign(input.campaignId);
    const step = allSteps.find((s) => s.order === input.stepOrder);
    if (!step) return left(new Error("Step not found"));

    const pending = await this.recipients.findPendingForStep(input.campaignId, input.stepOrder);
    const delayRange: DelayRange = input.delayRange ?? { min: 8000, max: 25000 };

    let sent = 0;
    let failed = 0;
    let suppressed = 0;

    for (const recipient of pending) {
      const isSuppressed = await this.suppressions.isEmailSuppressed(recipient.email, campaign.ownerId);
      if (isSuppressed) {
        suppressed++;
        continue;
      }

      // Guard against duplicate sends (e.g. triggered twice in quick succession)
      const alreadySent = await this.sends.existsByRecipientAndStep(recipient.id.toString(), step.id.toString());
      if (alreadySent) continue;

      const send = EmailCampaignSend.create({ recipientId: recipient.id.toString(), stepId: step.id.toString() });

      let subject = this.resolver.resolve(step.subject, recipient);
      let body = this.resolver.resolve(step.bodyHtml, recipient, input.trackingBaseUrl, send.id.toString());
      if (input.trackingBaseUrl) {
        body = this.resolver.injectTrackingPixel(body, input.trackingBaseUrl, send.id.toString());
      }

      try {
        const { messageId, threadId } = await this.gmail.send({
          userId: campaign.fromEmail,
          from: campaign.fromEmail,
          to: recipient.email,
          subject,
          bodyHtml: body,
        });

        (send as any).props.gmailMessageId = messageId;
        (send as any).props.gmailThreadId = threadId;
        await this.sends.save(send);

        recipient.markActive();
        recipient.advanceStep();

        const isLastStep = recipient.currentStep >= allSteps.length;
        if (isLastStep) recipient.markCompleted();

        await this.recipients.save(recipient);
        sent++;

        // Random delay between sends to avoid triggering spam filters
        const delayMs = delayRange.min + Math.floor(Math.random() * (delayRange.max - delayRange.min));
        await sleep(delayMs);
      } catch (err) {
        failed++;
        this.logger.error(
          `Failed to send email to ${recipient.email} for campaign ${input.campaignId} step ${input.stepOrder}: ${err}`,
        );
      }
    }

    return right({ sent, failed, suppressed });
  }
}
