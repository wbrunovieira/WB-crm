import { Injectable, Logger } from "@nestjs/common";
import {
  EmailMessagesRepository,
  EmailMessage,
} from "../application/repositories/email-messages.repository";

/**
 * TODO: Add EmailMessage model to Prisma schema.
 *
 * Stub implementation: stores in memory during runtime.
 * Replace with full Prisma implementation once schema is updated.
 *
 * Required schema:
 * ```prisma
 * model EmailMessage {
 *   id              String   @id @default(cuid())
 *   gmailMessageId  String   @unique
 *   threadId        String
 *   from            String
 *   to              String
 *   subject         String
 *   bodyText        String?
 *   activityId      String?
 *   ownerId         String
 *   sentAt          DateTime
 *   trackingToken   String?  @unique
 *   openedAt        DateTime?
 *   openCount       Int      @default(0)
 *   lastClickedAt   DateTime?
 *   clickCount      Int      @default(0)
 *   createdAt       DateTime @default(now())
 *   updatedAt       DateTime @updatedAt
 *
 *   @@index([ownerId])
 *   @@index([trackingToken])
 *   @@map("email_messages")
 * }
 * ```
 */
@Injectable()
export class PrismaEmailMessagesRepository extends EmailMessagesRepository {
  private readonly logger = new Logger(PrismaEmailMessagesRepository.name);

  // In-memory store (stub)
  private readonly items: Map<string, EmailMessage> = new Map();

  async findByMessageId(messageId: string): Promise<EmailMessage | null> {
    for (const item of this.items.values()) {
      if (item.gmailMessageId === messageId) return item;
    }
    return null;
  }

  async save(message: EmailMessage): Promise<void> {
    this.items.set(message.id, { ...message });
    this.logger.debug("PrismaEmailMessagesRepository.save (stub)", { id: message.id });
  }

  async findPendingTranscriptions(): Promise<EmailMessage[]> {
    return [];
  }

  async update(message: EmailMessage): Promise<void> {
    if (this.items.has(message.id)) {
      this.items.set(message.id, { ...message });
    }
  }

  async findByOwnerId(ownerId: string): Promise<EmailMessage[]> {
    return Array.from(this.items.values()).filter((item) => item.ownerId === ownerId);
  }
}
