import { Injectable, Logger } from "@nestjs/common";
import { Either, right, left } from "@/core/either";
import { GmailMessage } from "../ports/gmail.port";
import { EmailMessagesRepository, EmailMessage } from "../repositories/email-messages.repository";
import { ActivitiesRepository } from "@/domain/activities/application/repositories/activities.repository";
import { Activity } from "@/domain/activities/enterprise/entities/activity";
import { PrismaService } from "@/infra/database/prisma.service";

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
    private readonly prisma: PrismaService,
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

        const campaigns = await this.prisma.emailCampaign.findMany({
          where: { ownerId },
          select: { id: true },
        });
        const campaignIds = campaigns.map((c: { id: string }) => c.id);

        if (campaignIds.length > 0) {
          // Exclude only already-bounced or unsubscribed — COMPLETED recipients can still bounce
          await this.prisma.emailCampaignRecipient.updateMany({
            where: { email: bouncedEmail, campaignId: { in: campaignIds }, status: { notIn: ["BOUNCED", "UNSUBSCRIBED"] } },
            data: { status: "BOUNCED" },
          });

          // Update the linked campaign_email Activity to reflect the bounce
          const bouncedSends = await this.prisma.emailCampaignSend.findMany({
            where: { recipient: { email: bouncedEmail, campaignId: { in: campaignIds } } },
            select: { id: true },
          });
          for (const send of bouncedSends) {
            const activity = await this.activitiesRepo.findByCampaignSendId(send.id);
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

        const alreadySuppressed = await this.prisma.emailSuppression.findFirst({
          where: { email: bouncedEmail, ownerId },
        });
        if (!alreadySuppressed) {
          await this.prisma.emailSuppression.create({
            data: { id: crypto.randomUUID(), email: bouncedEmail, ownerId, reason: "bounced", createdAt: new Date() },
          });
        }

        return right({ skipped: false, bounced: true });
      }

      // 3. Extract sender email (strip display name if present: "Name <email@example.com>")
      const fromEmail = this.extractEmail(message.from);

      // 3. Find matching contact/lead/organization by email
      let contactId: string | undefined;
      let leadId: string | undefined;
      let organizationId: string | undefined;

      if (fromEmail) {
        const contact = await this.prisma.contact.findFirst({
          where: { email: { equals: fromEmail, mode: "insensitive" }, ownerId },
          select: { id: true },
        });

        if (contact) {
          contactId = contact.id;
        } else {
          const leadContact = await this.prisma.leadContact.findFirst({
            where: {
              email: { equals: fromEmail, mode: "insensitive" },
              lead: { ownerId },
            },
            select: { leadId: true },
          });

          if (leadContact) {
            leadId = leadContact.leadId;
          } else {
            const organization = await this.prisma.organization.findFirst({
              where: { email: { equals: fromEmail, mode: "insensitive" }, ownerId },
              select: { id: true },
            });

            if (organization) {
              organizationId = organization.id;
            }
          }
        }
      }

      // Skip emails from unknown senders — no contact, lead contact, or organization matched
      if (!contactId && !leadId && !organizationId) {
        return right({ skipped: true });
      }

      // 4. Create Activity of type 'email'
      let activityId: string | undefined;

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
      activityId = activity.id.toString();

      // 5. Create EMAIL_RECEIVED notification
      // Link the notification to the matched entity page so the bell is clickable
      const link = leadId
        ? `/leads/${leadId}`
        : organizationId
          ? `/organizations/${organizationId}`
          : contactId
            ? `/contacts/${contactId}`
            : undefined;
      try {
        await this.prisma.notification.create({
          data: {
            type: "EMAIL_RECEIVED",
            status: "pending",
            title: `Email recebido — ${subject}`,
            summary: fromEmail ? `De: ${message.from}` : `De: ${message.from}`,
            payload: JSON.stringify({
              activityId,
              fromEmail: message.from,
              receivedToEmail: message.to,
              link,
            }),
            read: false,
            userId: ownerId,
          },
        });
      } catch (err) {
        this.logger.warn("ProcessIncomingEmailUseCase: failed to create notification", {
          error: err instanceof Error ? err.message : String(err),
        });
      }

      // 6. Save EmailMessage record
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
