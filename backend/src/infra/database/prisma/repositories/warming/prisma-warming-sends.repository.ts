import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";
import { WarmingSendsRepository } from "@/domain/warming/application/repositories/warming-sends.repository";
import { WarmingSend } from "@/domain/warming/enterprise/entities/warming-send.entity";
import { UniqueEntityID } from "@/core/unique-entity-id";

@Injectable()
export class PrismaWarmingSendsRepository implements WarmingSendsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toDomain(raw: {
    id: string; fromEmail: string; toEmail: string; subject: string;
    gmailMessageId: string | null; gmailThreadId: string | null;
    isAutoReply: boolean; warmingAccountId: string; sentAt: Date;
  }): WarmingSend {
    return WarmingSend.reconstitute(
      {
        fromEmail: raw.fromEmail,
        toEmail: raw.toEmail,
        subject: raw.subject,
        gmailMessageId: raw.gmailMessageId,
        gmailThreadId: raw.gmailThreadId,
        isAutoReply: raw.isAutoReply,
        warmingAccountId: raw.warmingAccountId,
        sentAt: raw.sentAt,
      },
      new UniqueEntityID(raw.id),
    );
  }

  async save(send: WarmingSend): Promise<void> {
    await this.prisma.warmingSend.create({
      data: {
        id: send.id.toString(),
        fromEmail: send.fromEmail,
        toEmail: send.toEmail,
        subject: send.subject,
        gmailMessageId: send.gmailMessageId,
        gmailThreadId: send.gmailThreadId,
        isAutoReply: send.isAutoReply,
        warmingAccountId: send.warmingAccountId,
        sentAt: send.sentAt,
      },
    });
  }

  async countTodayByAccount(warmingAccountId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.prisma.warmingSend.count({
      where: { warmingAccountId, sentAt: { gte: today } },
    });
  }

  async findRecentByAccount(warmingAccountId: string, limit: number): Promise<WarmingSend[]> {
    const rows = await this.prisma.warmingSend.findMany({
      where: { warmingAccountId },
      orderBy: { sentAt: "desc" },
      take: limit,
    });
    return rows.map((r) => this.toDomain(r));
  }

  async findAll(
    ownerId: string,
    page: number,
    pageSize: number,
  ): Promise<{ sends: WarmingSend[]; total: number }> {
    const where = {
      warmingAccount: { ownerId },
    };
    const [total, rows] = await Promise.all([
      this.prisma.warmingSend.count({ where }),
      this.prisma.warmingSend.findMany({
        where,
        orderBy: { sentAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return { total, sends: rows.map((r) => this.toDomain(r)) };
  }
}
