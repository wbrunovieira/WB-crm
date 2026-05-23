import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";
import { EmailCampaignStepsRepository } from "@/domain/email-campaigns/application/repositories/email-campaign-steps.repository";
import { EmailCampaignStep } from "@/domain/email-campaigns/enterprise/entities/email-campaign-step.entity";
import { UniqueEntityID } from "@/core/unique-entity-id";

@Injectable()
export class PrismaEmailCampaignStepsRepository implements EmailCampaignStepsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toDomain(raw: any): EmailCampaignStep {
    return EmailCampaignStep.reconstitute(
      { campaignId: raw.campaignId, order: raw.order, subject: raw.subject, bodyHtml: raw.bodyHtml, delayDays: raw.delayDays },
      new UniqueEntityID(raw.id),
    );
  }

  async findByCampaign(campaignId: string) {
    const rows = await this.prisma.emailCampaignStep.findMany({ where: { campaignId }, orderBy: { order: "asc" } });
    return rows.map((r) => this.toDomain(r));
  }

  async findById(id: string) {
    const raw = await this.prisma.emailCampaignStep.findUnique({ where: { id } });
    return raw ? this.toDomain(raw) : null;
  }

  async save(step: EmailCampaignStep) {
    await this.prisma.emailCampaignStep.upsert({
      where: { id: step.id.toString() },
      create: {
        id: step.id.toString(),
        campaignId: step.campaignId,
        order: step.order,
        subject: step.subject,
        bodyHtml: step.bodyHtml,
        delayDays: step.delayDays,
      },
      update: { subject: step.subject, bodyHtml: step.bodyHtml, delayDays: step.delayDays, order: step.order },
    });
  }

  async deleteByCampaign(campaignId: string) {
    await this.prisma.emailCampaignStep.deleteMany({ where: { campaignId } });
  }
}
