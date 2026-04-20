import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";
import {
  EmailTrackingRepository,
  EmailTrackingRecord,
} from "../application/repositories/email-tracking.repository";

@Injectable()
export class PrismaEmailTrackingRepository extends EmailTrackingRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findByToken(token: string): Promise<EmailTrackingRecord | null> {
    const row = await this.prisma.emailTracking.findUnique({
      where: { token },
    });
    return row ? this.toDomain(row) : null;
  }

  async save(record: EmailTrackingRecord): Promise<void> {
    await this.prisma.emailTracking.upsert({
      where: { token: record.token },
      create: {
        id: record.id,
        token: record.token,
        type: record.type,
        emailMessageId: record.emailMessageId,
        targetUrl: record.targetUrl ?? null,
        ownerId: record.ownerId,
      },
      update: {
        type: record.type,
        targetUrl: record.targetUrl ?? null,
      },
    });
  }

  async recordOpen(token: string, userAgent?: string, ip?: string): Promise<void> {
    const now = new Date();
    await this.prisma.emailTracking.update({
      where: { token },
      data: {
        openCount: { increment: 1 },
        lastOpenAt: now,
        firstOpenAt: undefined, // set below via raw if not yet set
        userAgent: userAgent ?? null,
        ip: ip ?? null,
      },
    });

    // Set firstOpenAt only if not already set (Prisma doesn't support conditional set in update)
    await this.prisma.emailTracking.updateMany({
      where: { token, firstOpenAt: null },
      data: { firstOpenAt: now },
    });
  }

  async recordClick(token: string, url: string, userAgent?: string, ip?: string): Promise<void> {
    const now = new Date();
    await this.prisma.emailTracking.update({
      where: { token },
      data: {
        clickCount: { increment: 1 },
        targetUrl: url,
        lastClickAt: now,
        userAgent: userAgent ?? null,
        ip: ip ?? null,
      },
    });

    await this.prisma.emailTracking.updateMany({
      where: { token, firstClickAt: null },
      data: { firstClickAt: now },
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toDomain(row: any): EmailTrackingRecord {
    return {
      id: row.id,
      token: row.token,
      type: row.type as "open" | "click",
      emailMessageId: row.emailMessageId,
      targetUrl: row.targetUrl ?? undefined,
      ownerId: row.ownerId,
    };
  }
}
