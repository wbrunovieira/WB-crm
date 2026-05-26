import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";
import { EmailCampaignSendsRepository } from "@/domain/email-campaigns/application/repositories/email-campaign-sends.repository";
import { EmailCampaignSend } from "@/domain/email-campaigns/enterprise/entities/email-campaign-send.entity";
import { UniqueEntityID } from "@/core/unique-entity-id";

@Injectable()
export class PrismaEmailCampaignSendsRepository implements EmailCampaignSendsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toDomain(raw: any): EmailCampaignSend {
    let clickData: Record<string, number> = {};
    if (raw.clickData) {
      try { clickData = JSON.parse(raw.clickData); } catch { /* keep empty */ }
    }
    return EmailCampaignSend.reconstitute(
      {
        recipientId: raw.recipientId,
        stepId: raw.stepId,
        sentAt: raw.sentAt,
        openedAt: raw.openedAt ?? undefined,
        openCount: raw.openCount ?? 0,
        clickedAt: raw.clickedAt ?? undefined,
        clickedUrl: raw.clickedUrl ?? undefined,
        clickData,
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

  async existsByRecipientAndStep(recipientId: string, stepId: string): Promise<boolean> {
    const count = await this.prisma.emailCampaignSend.count({ where: { recipientId, stepId } });
    return count > 0;
  }

  async countByStep(stepId: string) {
    const [sent, opened, clicked] = await Promise.all([
      this.prisma.emailCampaignSend.count({ where: { stepId } }),
      this.prisma.emailCampaignSend.count({ where: { stepId, openedAt: { not: null } } }),
      this.prisma.emailCampaignSend.count({ where: { stepId, clickedAt: { not: null } } }),
    ]);
    return { sent, opened, clicked };
  }

  async aggregateByCampaign(campaignId: string) {
    const [totalSent, uniqueOpened, uniqueClicked] = await Promise.all([
      this.prisma.emailCampaignSend.count({ where: { step: { campaignId } } }),
      this.prisma.emailCampaignSend.count({ where: { step: { campaignId }, openedAt: { not: null } } }),
      this.prisma.emailCampaignSend.count({ where: { step: { campaignId }, clickedAt: { not: null } } }),
    ]);
    return { totalSent, uniqueOpened, uniqueClicked };
  }

  async save(send: EmailCampaignSend) {
    const clickData = Object.keys(send.clickData).length > 0
      ? JSON.stringify(send.clickData)
      : null;
    await this.prisma.emailCampaignSend.upsert({
      where: { id: send.id.toString() },
      create: {
        id: send.id.toString(),
        recipientId: send.recipientId,
        stepId: send.stepId,
        sentAt: send.sentAt,
        openedAt: send.openedAt,
        openCount: send.openCount,
        clickedAt: send.clickedAt,
        clickedUrl: send.clickedUrl,
        clickData,
        gmailMessageId: send.gmailMessageId,
        gmailThreadId: send.gmailThreadId,
      },
      update: {
        openedAt: send.openedAt,
        openCount: send.openCount,
        clickedAt: send.clickedAt,
        clickedUrl: send.clickedUrl,
        clickData,
        gmailMessageId: send.gmailMessageId,
        gmailThreadId: send.gmailThreadId,
      },
    });
  }
}
