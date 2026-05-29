import { Injectable, Logger } from "@nestjs/common";
import { Either, right, left } from "@/core/either";
import { GmailMessage } from "../ports/gmail.port";
import { EmailMessagesRepository, EmailMessage } from "../repositories/email-messages.repository";
import { ActivitiesRepository } from "@/domain/activities/application/repositories/activities.repository";
import { Activity } from "@/domain/activities/enterprise/entities/activity";
import { ContactsRepository } from "@/domain/contacts/application/repositories/contacts.repository";
import { LeadContactsRepository } from "@/domain/leads/application/repositories/lead-contacts.repository";
import { OrganizationsRepository } from "@/domain/organizations/application/repositories/organizations.repository";
import { EmailCampaignsRepository } from "@/domain/email-campaigns/application/repositories/email-campaigns.repository";
import { EmailCampaignRecipientsRepository } from "@/domain/email-campaigns/application/repositories/email-campaign-recipients.repository";
import { EmailCampaignSendsRepository } from "@/domain/email-campaigns/application/repositories/email-campaign-sends.repository";
import { EmailSuppressionsRepository } from "@/domain/email-campaigns/application/repositories/email-suppressions.repository";
import { EmailSuppression } from "@/domain/email-campaigns/enterprise/entities/email-suppression.entity";
import { CreateNotificationUseCase } from "@/domain/notifications/application/use-cases/notifications.use-cases";
import { EntityLink } from "@/domain/notifications/enterprise/value-objects/entity-link.vo";

export interface ProcessIncomingEmailOutput {
  activityId?: string;
  skipped: boolean;
  bounced?: boolean;
}

@Injectable()
export class ProcessIncomingEmailUseCase {
  private readonly logger = new Logger(ProcessIncomingEmailUseCase.name);

  constructor(
    private readonly emailMessagesRepo: EmailMessagesRepository,
    private readonly activitiesRepo: ActivitiesRepository,
    private readonly contacts: ContactsRepository,
    private readonly leadContacts: LeadContactsRepository,
    private readonly organizations: OrganizationsRepository,
    private readonly emailCampaigns: EmailCampaignsRepository,
    private readonly recipients: EmailCampaignRecipientsRepository,
    private readonly sends: EmailCampaignSendsRepository,
    private readonly suppressions: EmailSuppressionsRepository,
    private readonly createNotification: CreateNotificationUseCase,
  ) {}

  async execute(
    message: GmailMessage,
    ownerId: string,
  ): Promise<Either<Error, ProcessIncomingEmailOutput>> {
    try {
      // 1. Idempotency check
      const existing = await this.emailMessagesRepo.findByMessageId(message.messageId);
      if (existing) {
        return right({ skipped: true });
      }

      // 2. Detect bounce messages from mailer-daemon / postmaster
      if (this.isBounceMessage(message.from, message.subject)) {
        const bouncedEmail = this.extractBouncedEmail(message.bodyText) ?? this.extractBouncedEmail(message.bodyHtml);
        if (!bouncedEmail) return right({ skipped: true });

        await this.handleBounce(bouncedEmail, ownerId);
        return right({ skipped: false, bounced: true });
      }

      // 3. Extract sender email (strip display name if present: "Name <email@example.com>")
      const fromEmail = this.extractEmail(message.from);

      // 4. Find matching contact/lead/organization by email (scoped to the mailbox owner)
      let contactId: string | undefined;
      let leadId: string | undefined;
      let organizationId: string | undefined;

      if (fromEmail) {
        contactId = (await this.contacts.findIdByEmailForOwner(fromEmail, ownerId)) ?? undefined;
        if (!contactId) {
          leadId = (await this.leadContacts.findLeadIdByContactEmailForOwner(fromEmail, ownerId)) ?? undefined;
          if (!leadId) {
            organizationId = (await this.organizations.findIdByEmailForOwner(fromEmail, ownerId)) ?? undefined;
          }
        }
      }

      // Skip emails from unknown senders — no contact, lead contact, or organization matched
      if (!contactId && !leadId && !organizationId) {
        return right({ skipped: true });
      }

      // 5. Create Activity of type 'email'
      const subject = message.subject || "(sem assunto)";
      const snippet = message.bodyText?.slice(0, 500) || "";
      const description = snippet ? `${subject}\n\n${snippet}` : subject;

      const activity = Activity.create({
        ownerId,
        type: "email",
        subject: `Email — ${subject}`,
        description,
        completed: true,
        completedAt: message.receivedAt,
        dueDate: message.receivedAt,
        contactId,
        leadId,
        organizationId,
        meetingNoShow: false,
        emailReplied: false,
        emailMessageId: message.messageId,
        emailThreadId: message.threadId,
        emailSubject: subject,
        emailFromAddress: fromEmail,
        emailOpenCount: 0,
        emailLinkClickCount: 0,
      });

      await this.activitiesRepo.save(activity);
      const activityId = activity.id.toString();

      // 6. Create EMAIL_RECEIVED notification linked to the matched entity page
      const link = EntityLink.firstOf([
        { type: "lead", id: leadId },
        { type: "organization", id: organizationId },
        { type: "contact", id: contactId },
      ])?.value;
      const notifResult = await this.createNotification.execute({
        type: "EMAIL_RECEIVED",
        title: `Email recebido — ${subject}`,
        summary: `De: ${message.from}`,
        payload: JSON.stringify({
          activityId,
          fromEmail: message.from,
          receivedToEmail: message.to,
          link,
        }),
        userId: ownerId,
      });
      if (notifResult.isLeft()) {
        this.logger.warn("ProcessIncomingEmailUseCase: failed to create notification", {
          error: notifResult.value.message,
        });
      }

      // 7. Save EmailMessage record
      const emailRecord: EmailMessage = {
        id: activityId, // use same ID for simplicity
        gmailMessageId: message.messageId,
        threadId: message.threadId,
        from: message.from,
        to: message.to,
        subject,
        bodyText: message.bodyText,
        activityId,
        ownerId,
        sentAt: message.receivedAt,
        openCount: 0,
        clickCount: 0,
      };

      await this.emailMessagesRepo.save(emailRecord);

      return right({ activityId, skipped: false });
    } catch (err) {
      this.logger.error("ProcessIncomingEmailUseCase: error", {
        messageId: message.messageId,
        error: err instanceof Error ? err.message : String(err),
      });
      return left(err instanceof Error ? err : new Error(String(err)));
    }
  }

  /**
   * Marks the bounced email's campaign recipients (owned by `ownerId`) as BOUNCED,
   * fails their linked campaign_email activities, and adds the email to the
   * suppression list.
   */
  private async handleBounce(bouncedEmail: string, ownerId: string): Promise<void> {
    const campaigns = await this.emailCampaigns.findAllByOwner(ownerId);
    const campaignIds = new Set(campaigns.map((c) => c.id.toString()));

    if (campaignIds.size > 0) {
      const recipientsForEmail = (await this.recipients.findByEmail(bouncedEmail)).filter((r) =>
        campaignIds.has(r.campaignId),
      );

      // Mark as BOUNCED (skip already-bounced / unsubscribed)
      for (const recipient of recipientsForEmail) {
        if (recipient.status !== "BOUNCED" && recipient.status !== "UNSUBSCRIBED") {
          recipient.markBounced();
          await this.recipients.save(recipient);
        }
      }

      // Fail the linked campaign_email Activity for every send of these recipients
      for (const recipient of recipientsForEmail) {
        const recipientSends = await this.sends.findByRecipient(recipient.id.toString());
        for (const send of recipientSends) {
          const activity = await this.activitiesRepo.findByCampaignSendId(send.id.toString());
          if (activity && !activity.failedAt) {
            activity.update({
              completed: false,
              completedAt: undefined,
              failedAt: new Date(),
              failReason: "Email retornou (bounce)",
            });
            await this.activitiesRepo.save(activity);
          }
        }
      }
    }

    const alreadySuppressed = await this.suppressions.isEmailSuppressed(bouncedEmail, ownerId);
    if (!alreadySuppressed) {
      await this.suppressions.save(
        EmailSuppression.create({ email: bouncedEmail, ownerId, reason: "bounced" }),
      );
    }
  }

  private extractEmail(from: string): string | undefined {
    const angleMatch = from.match(/<([^>]+)>/);
    if (angleMatch) return angleMatch[1].trim().toLowerCase();
    const trimmed = from.trim().toLowerCase();
    if (trimmed.includes("@")) return trimmed;
    return undefined;
  }

  private isBounceMessage(from: string, subject?: string): boolean {
    const lower = from.toLowerCase();
    if (
      lower.includes("mailer-daemon") ||
      lower.includes("postmaster@") ||
      lower.includes("mail delivery subsystem")
    ) return true;

    if (subject) {
      const subjectLower = subject.toLowerCase();
      if (
        subjectLower.startsWith("undeliverable:") ||
        subjectLower.includes("mail delivery failed") ||
        subjectLower.includes("returned mail:")
      ) return true;
    }

    return false;
  }

  private extractBouncedEmail(body: string | undefined): string | undefined {
    if (!body) return undefined;
    // Strip HTML tags so regex works on both text/plain and text/html bodies
    const bodyText = body.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ");

    const emailPattern = "[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}";

    // DSN standard headers (RFC 3464)
    const finalRecipient = bodyText.match(new RegExp(`Final-Recipient:\\s*rfc822;\\s*(${emailPattern})`, "i"));
    if (finalRecipient) return finalRecipient[1].toLowerCase();

    const originalRecipient = bodyText.match(new RegExp(`Original-Recipient:\\s*rfc822;\\s*(${emailPattern})`, "i"));
    if (originalRecipient) return originalRecipient[1].toLowerCase();

    // Gmail EN: "wasn't delivered to email@domain"
    const notDelivered = bodyText.match(new RegExp(`wasn't delivered to\\s+(${emailPattern})`, "i"));
    if (notDelivered) return notDelivered[1].toLowerCase();

    // Microsoft 365: "Your message to email@domain couldn't be delivered" / "could not be delivered"
    const ms365 = bodyText.match(new RegExp(`message to\\s+(${emailPattern})\\s+(?:couldn't|could not) be delivered`, "i"));
    if (ms365) return ms365[1].toLowerCase();

    // Gmail PT-BR: "não foi entregue para email@domain"
    const naoEntregue = bodyText.match(new RegExp(`não foi entregue para\\s+(${emailPattern})`, "i"));
    if (naoEntregue) return naoEntregue[1].toLowerCase();

    // Gmail PT-BR mailbox full: "não foi entregue a email@domain" (uses "a" not "para")
    const naoEntregueA = bodyText.match(new RegExp(`não foi entregue a\\s+(${emailPattern})`, "i"));
    if (naoEntregueA) return naoEntregueA[1].toLowerCase();

    // Gmail PT-BR misconfigured server: "entregar a mensagem a email@domain"
    const entregarA = bodyText.match(new RegExp(`entregar a mensagem a\\s+(${emailPattern})`, "i"));
    if (entregarA) return entregarA[1].toLowerCase();

    // Gmail PT-BR soft/DNS bounce: "entrega da mensagem para email@domain" (inclui "Entrega incompleta" DNS SERVFAIL)
    const entregaPara = bodyText.match(new RegExp(`entrega da mensagem para\\s+(${emailPattern})`, "i"));
    if (entregaPara) return entregaPara[1].toLowerCase();

    // cPanel/Exim: "The following address(es) failed: email@domain"
    const cpanelFailed = bodyText.match(new RegExp(`address(?:es)?\\s+failed[:\\s]+(${emailPattern})`, "i"));
    if (cpanelFailed) return cpanelFailed[1].toLowerCase();

    // Proofpoint: "permanent fatal errors ----- <email@domain" or "fatal errors ... email@domain"
    const proofpoint = bodyText.match(new RegExp(`fatal errors.*?-*\\s*<?(${emailPattern})`, "i"));
    if (proofpoint) return proofpoint[1].toLowerCase();

    // Generic catch-all: "failed ... to/recipient(s): email@domain"
    const failedTo = bodyText.match(new RegExp(`failed.*?(?:to|recipients?)[:\\s]+(${emailPattern})`, "i"));
    if (failedTo) return failedTo[1].toLowerCase();

    return undefined;
  }
}
