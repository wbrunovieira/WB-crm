import { Injectable, Logger } from "@nestjs/common";
import {
  EmailTrackingRepository,
  EmailTrackingRecord,
} from "../application/repositories/email-tracking.repository";

/**
 * TODO: Add EmailTracking model to Prisma schema.
 *
 * Stub implementation: stores in memory during runtime.
 * Replace with full Prisma implementation once schema is updated.
 *
 * Required schema:
 * ```prisma
 * model EmailTracking {
 *   id             String    @id @default(cuid())
 *   token          String    @unique
 *   type           String    // "open" | "click"
 *   emailMessageId String
 *   targetUrl      String?
 *   ownerId        String
 *   openCount      Int       @default(0)
 *   clickCount     Int       @default(0)
 *   firstOpenAt    DateTime?
 *   lastOpenAt     DateTime?
 *   firstClickAt   DateTime?
 *   lastClickAt    DateTime?
 *   userAgent      String?
 *   ip             String?
 *   createdAt      DateTime  @default(now())
 *   updatedAt      DateTime  @updatedAt
 *
 *   @@index([token])
 *   @@index([emailMessageId])
 *   @@map("email_tracking")
 * }
 * ```
 */
@Injectable()
export class PrismaEmailTrackingRepository extends EmailTrackingRepository {
  private readonly logger = new Logger(PrismaEmailTrackingRepository.name);

  // In-memory store (stub)
  private readonly items: Map<string, EmailTrackingRecord & {
    openCount: number;
    clickCount: number;
    lastUserAgent?: string;
    lastIp?: string;
  }> = new Map();

  async findByToken(token: string): Promise<EmailTrackingRecord | null> {
    return this.items.get(token) ?? null;
  }

  async save(record: EmailTrackingRecord): Promise<void> {
    this.items.set(record.token, { ...record, openCount: 0, clickCount: 0 });
    this.logger.debug("PrismaEmailTrackingRepository.save (stub)", { token: record.token });
  }

  async recordOpen(token: string, userAgent?: string, ip?: string): Promise<void> {
    const record = this.items.get(token);
    if (record) {
      record.openCount++;
      record.lastUserAgent = userAgent;
      record.lastIp = ip;
    }
    this.logger.debug("PrismaEmailTrackingRepository.recordOpen (stub)", { token });
  }

  async recordClick(token: string, url: string, userAgent?: string, ip?: string): Promise<void> {
    const record = this.items.get(token);
    if (record) {
      record.clickCount++;
      record.targetUrl = url;
      record.lastUserAgent = userAgent;
      record.lastIp = ip;
    }
    this.logger.debug("PrismaEmailTrackingRepository.recordClick (stub)", { token, url });
  }
}
