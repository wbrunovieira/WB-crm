import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";
import { EmailCampaignSendsRepository } from "@/domain/email-campaigns/application/repositories/email-campaign-sends.repository";
import { EmailCampaignSend } from "@/domain/email-campaigns/enterprise/entities/email-campaign-send.entity";
import { UniqueEntityID } from "@/core/unique-entity-id";

@Injectable()
export class PrismaEmailCampaignSendsRepository implements EmailCampaignSendsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toDomain(raw: any): EmailCampaignSend {
    return EmailCampaignSend.reconstitute(
      {
        recipientId: raw.recipientId,
        stepId: raw.stepId,
        sentAt: raw.sentAt,
        openedAt: raw.openedAt ?? undefined,
        clickedAt: raw.clickedAt ?? undefined,
        gmailMessageId: raw.gmailMessageId ?? undefined,
        gmailThreadId: raw.gmailThreadId ?? undefined,
      },
      new UniqueEntityID(raw.id),
    );
  }

  async findById(id: string) {
    const raw = await this.prisma.emailCampaignSend.findUnique({ where: { id } });
    return raw ? this.toDomain(raw) : null;
  }

  async findByRecipient(recipientId: string) {
    const rows = await this.prisma.emailCampaignSend.findMany({ where: { recipientId } });
    return rows.map((r) => this.toDomain(r));
  }

  async countByStep(stepId: string) {
    const [sent, opened, clicked] = await Promise.all([
      this.prisma.emailCampaignSend.count({ where: { stepId } }),
      this.prisma.emailCampaignSend.count({ where: { stepId, openedAt: { not: null } } }),
      this.prisma.emailCampaignSend.count({ where: { stepId, clickedAt: { not: null } } }),
    ]);
    return { sent, opened, clicked };
  }

  async save(send: EmailCampaignSend) {
    await this.prisma.emailCampaignSend.upsert({
      where: { id: send.id.toString() },
      create: {
        id: send.id.toString(),
        recipientId: send.recipientId,
        stepId: send.stepId,
        sentAt: send.sentAt,
        openedAt: send.openedAt,
        clickedAt: send.clickedAt,
        gmailMessageId: send.gmailMessageId,
        gmailThreadId: send.gmailThreadId,
      },
      update: {
        openedAt: send.openedAt,
        clickedAt: send.clickedAt,
        gmailMessageId: send.gmailMessageId,
        gmailThreadId: send.gmailThreadId,
      },
    });
  }
}
