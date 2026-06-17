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
import { EmailSuppression } from "../../enterprise/entities/email-suppression.entity";
import { ActivitiesRepository } from "@/domain/activities/application/repositories/activities.repository";
import { Activity } from "@/domain/activities/enterprise/entities/activity";
import { EmailAddress } from "@/domain/integrations/email/enterprise/value-objects/email-address.vo";
import { RecipientContextPort } from "../ports/recipient-context.port";

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
    private readonly activitiesRepo: ActivitiesRepository,
    private readonly recipientContext: RecipientContextPort,
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
      const suppression = await this.suppressions.findByEmail(recipient.email.trim().toLowerCase(), campaign.ownerId);
      if (suppression) {
        suppressed++;
        if (suppression.reason === "unsubscribed") {
          recipient.unsubscribe();
        } else {
          // Already on the suppression list (e.g. a prior bounce). We are NOT
          // sending — so this is a suppression, not a bounce. Marking it BOUNCED
          // would inflate the campaign's bounce rate with contacts we never sent to.
          recipient.markSuppressed();
        }
        await this.recipients.save(recipient);
        continue;
      }

      // Guard against duplicate sends (e.g. triggered twice in quick succession)
      const alreadySent = await this.sends.existsByRecipientAndStep(recipient.id.toString(), step.id.toString());
      if (alreadySent) {
        // Email was sent but recipient status wasn't advanced (e.g., process crashed after send).
        // Recover by advancing status without re-sending.
        recipient.markActive();
        recipient.advanceStep();
        const isLastStep = recipient.currentStep >= allSteps.length;
        if (isLastStep) recipient.markCompleted();
        await this.recipients.save(recipient);
        continue;
      }

      // Pre-validate email before touching Gmail — catches compound fields like "a@x.com / b@y.com"
      if (!this.isValidEmail(recipient.email)) {
        failed++;
        const reason = `Email inválido: ${recipient.email}`;
        this.logger.warn(`SendCampaignStep: invalid email, skipping Gmail call — ${reason}`);
        recipient.markBounced();
        await this.recipients.save(recipient);
        await this.addBounceSuppression(recipient.email, campaign.ownerId);
        const subject = this.resolver.resolve(step.subject, recipient);
        await this.createBounceActivity(campaign.ownerId, input.campaignId, subject, undefined, reason, recipient.recipientType, recipient.recipientId);
        continue;
      }

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

        await this.createSentActivity(campaign.ownerId, input.campaignId, subject, messageId, threadId, send.id.toString(), recipient.recipientType, recipient.recipientId);

        // Random delay between sends to avoid triggering spam filters
        const delayMs = delayRange.min + Math.floor(Math.random() * (delayRange.max - delayRange.min));
        await sleep(delayMs);
      } catch (err) {
        failed++;
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(
          `Failed to send email to ${recipient.email} for campaign ${input.campaignId} step ${input.stepOrder}: ${msg}`,
        );
        // Gmail-level permanent rejections (address exists but server rejects it)
        const isGmailRejection = /invalid.*address|recipient.*invalid|bad.*recipient|does not exist|550|551|553/i.test(msg);
        if (isGmailRejection) {
          recipient.markBounced();
          await this.recipients.save(recipient);
          await this.addBounceSuppression(recipient.email, campaign.ownerId);
          // No sendId — the send was never persisted (Gmail rejected before delivery)
          await this.createBounceActivity(campaign.ownerId, input.campaignId, subject, undefined, msg, recipient.recipientType, recipient.recipientId);
        }
      }
    }

    return right({ sent, failed, suppressed });
  }

  private async createSentActivity(
    ownerId: string,
    campaignId: string,
    subject: string,
    messageId: string,
    threadId: string,
    sendId: string,
    recipientType: string,
    recipientId: string,
  ) {
    const context = await this.recipientContext.resolve(recipientType, recipientId);

    const activity = Activity.create({
      ownerId,
      type: "campaign_email",
      subject,
      completed: true,
      completedAt: new Date(),
      meetingNoShow: false,
      emailReplied: false,
      emailOpenCount: 0,
      emailLinkClickCount: 0,
      emailMessageId: messageId,
      emailThreadId: threadId,
      emailSubject: subject,
      emailCampaignSendId: sendId,
      emailCampaignId: campaignId,
      leadId: context.leadId,
      organizationId: context.organizationId,
      contactId: context.contactId,
      partnerId: context.partnerId,
    });

    await this.activitiesRepo.save(activity);
  }

  // Any permanent send failure must land on the suppression list so future
  // campaigns never retry the address (transient errors are NOT suppressed)
  private async addBounceSuppression(email: string, ownerId: string) {
    const normalized = email.trim().toLowerCase();
    const existing = await this.suppressions.findByEmail(normalized, ownerId);
    if (!existing) {
      await this.suppressions.save(EmailSuppression.create({ email: normalized, ownerId, reason: "bounced" }));
    }
  }

  private isValidEmail(email: string): boolean {
    // Validation lives in the EmailAddress VO. Compound/dirty fields like
    // "a@x.com / b@y.com" carry a second "@" and are rejected by the VO.
    return EmailAddress.create(email).isRight();
  }

  private async createBounceActivity(
    ownerId: string,
    campaignId: string,
    subject: string,
    sendId: string | undefined,
    bounceReason: string,
    recipientType: string,
    recipientId: string,
  ) {
    const context = await this.recipientContext.resolve(recipientType, recipientId);

    const activity = Activity.create({
      ownerId,
      type: "campaign_email",
      subject,
      completed: false,
      failedAt: new Date(),
      failReason: `Bounce: ${bounceReason}`,
      meetingNoShow: false,
      emailReplied: false,
      emailOpenCount: 0,
      emailLinkClickCount: 0,
      emailSubject: subject,
      emailCampaignSendId: sendId,
      emailCampaignId: campaignId,
      leadId: context.leadId,
      organizationId: context.organizationId,
      contactId: context.contactId,
      partnerId: context.partnerId,
    });

    await this.activitiesRepo.save(activity);
  }
}
