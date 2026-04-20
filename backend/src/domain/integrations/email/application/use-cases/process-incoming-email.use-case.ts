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

      // 2. Extract sender email (strip display name if present: "Name <email@example.com>")
      const fromEmail = this.extractEmail(message.from);

      // 3. Find matching contact/lead by email
      let contactId: string | undefined;
      let leadId: string | undefined;

      if (fromEmail) {
        // Check Contact table
        const contact = await this.prisma.contact.findFirst({
          where: { email: { equals: fromEmail, mode: "insensitive" }, ownerId },
          select: { id: true },
        });

        if (contact) {
          contactId = contact.id;
        } else {
          // Check LeadContact table
          const leadContact = await this.prisma.leadContact.findFirst({
            where: {
              email: { equals: fromEmail, mode: "insensitive" },
              lead: { ownerId },
            },
            select: { leadId: true },
          });

          if (leadContact) {
            leadId = leadContact.leadId;
          }
        }
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

      // 5. Save EmailMessage record
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
    // Handle "Name <email@example.com>" format
    const angleMatch = from.match(/<([^>]+)>/);
    if (angleMatch) return angleMatch[1].trim().toLowerCase();

    // Handle plain email
    const trimmed = from.trim().toLowerCase();
    if (trimmed.includes("@")) return trimmed;

    return undefined;
  }
}
