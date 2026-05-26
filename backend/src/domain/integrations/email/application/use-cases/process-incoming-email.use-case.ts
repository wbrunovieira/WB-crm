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
      if (this.isBounceMessage(message.from)) {
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

  private isBounceMessage(from: string): boolean {
    const lower = from.toLowerCase();
    return (
      lower.includes("mailer-daemon") ||
      lower.includes("postmaster@") ||
      lower.includes("mail delivery subsystem")
    );
  }

  private extractBouncedEmail(body: string | undefined): string | undefined {
    if (!body) return undefined;
    // Strip HTML tags so regex works on both text/plain and text/html bodies
    const bodyText = body.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ");

    // DSN standard headers (RFC 3464)
    const finalRecipient = bodyText.match(/Final-Recipient:\s*rfc822;\s*([^\s\r\n]+)/i);
    if (finalRecipient) return finalRecipient[1].toLowerCase();

    const originalRecipient = bodyText.match(/Original-Recipient:\s*rfc822;\s*([^\s\r\n]+)/i);
    if (originalRecipient) return originalRecipient[1].toLowerCase();

    // Gmail human-readable: "wasn't delivered to email@domain" (EN)
    const notDelivered = bodyText.match(/wasn't delivered to\s+([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/i);
    if (notDelivered) return notDelivered[1].toLowerCase();

    // Gmail PT-BR: "não foi entregue para email@domain"
    const naoEntregue = bodyText.match(/não foi entregue para\s+([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/i);
    if (naoEntregue) return naoEntregue[1].toLowerCase();

    // Generic: "failed ... to email@domain"
    const failedTo = bodyText.match(/failed.*?(?:to|recipients?)[:\s]+([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/i);
    if (failedTo) return failedTo[1].toLowerCase();

    return undefined;
  }
}
