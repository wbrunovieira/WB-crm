import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";
import { EmailCampaignRecipientsRepository } from "@/domain/email-campaigns/application/repositories/email-campaign-recipients.repository";
import { EmailCampaignRecipient, RecipientType, RecipientStatus } from "@/domain/email-campaigns/enterprise/entities/email-campaign-recipient.entity";
import { UniqueEntityID } from "@/core/unique-entity-id";

@Injectable()
export class PrismaEmailCampaignRecipientsRepository implements EmailCampaignRecipientsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toDomain(raw: any): EmailCampaignRecipient {
    return EmailCampaignRecipient.reconstitute(
      {
        campaignId: raw.campaignId,
        recipientType: raw.recipientType as RecipientType,
        recipientId: raw.recipientId,
        email: raw.email,
        name: raw.name ?? undefined,
        company: raw.company ?? undefined,
        role: raw.role ?? undefined,
        customVars: raw.customVars ? JSON.parse(raw.customVars) : undefined,
        currentStep: raw.currentStep,
        status: raw.status as RecipientStatus,
        unsubscribedAt: raw.unsubscribedAt ?? undefined,
      },
      new UniqueEntityID(raw.id),
    );
  }

  async findByCampaign(campaignId: string) {
    const rows = await this.prisma.emailCampaignRecipient.findMany({ where: { campaignId } });
    return rows.map((r) => this.toDomain(r));
  }

  async findById(id: string) {
    const raw = await this.prisma.emailCampaignRecipient.findUnique({ where: { id } });
    return raw ? this.toDomain(raw) : null;
  }

  async findPendingForStep(campaignId: string, step: number) {
    const rows = await this.prisma.emailCampaignRecipient.findMany({
      where: { campaignId, currentStep: step, status: { in: ["PENDING", "ACTIVE"] } },
    });
    return rows.map((r) => this.toDomain(r));
  }

  async save(recipient: EmailCampaignRecipient) {
    await this.prisma.emailCampaignRecipient.upsert({
      where: { id: recipient.id.toString() },
      create: {
        id: recipient.id.toString(),
        campaignId: recipient.campaignId,
        recipientType: recipient.recipientType,
        recipientId: recipient.recipientId,
        email: recipient.email,
        name: recipient.name,
        company: recipient.company,
        role: recipient.role,
        customVars: recipient.customVars ? JSON.stringify(recipient.customVars) : null,
        currentStep: recipient.currentStep,
        status: recipient.status,
        unsubscribedAt: recipient.unsubscribedAt,
      },
      update: {
        currentStep: recipient.currentStep,
        status: recipient.status,
        unsubscribedAt: recipient.unsubscribedAt,
        name: recipient.name,
        company: recipient.company,
        role: recipient.role,
        customVars: recipient.customVars ? JSON.stringify(recipient.customVars) : null,
      },
    });
  }

  async saveMany(recipients: EmailCampaignRecipient[]) {
    await Promise.all(recipients.map((r) => this.save(r)));
  }

  async deleteByCampaign(campaignId: string) {
    await this.prisma.emailCampaignRecipient.deleteMany({ where: { campaignId } });
  }
}
