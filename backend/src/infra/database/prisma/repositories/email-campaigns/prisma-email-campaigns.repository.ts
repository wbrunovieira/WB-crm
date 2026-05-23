import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";
import { EmailCampaignsRepository } from "@/domain/email-campaigns/application/repositories/email-campaigns.repository";
import { EmailCampaign, EmailCampaignStatus } from "@/domain/email-campaigns/enterprise/entities/email-campaign.entity";
import { UniqueEntityID } from "@/core/unique-entity-id";

@Injectable()
export class PrismaEmailCampaignsRepository implements EmailCampaignsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toDomain(raw: any): EmailCampaign {
    return EmailCampaign.reconstitute(
      {
        name: raw.name,
        description: raw.description ?? undefined,
        fromEmail: raw.fromEmail,
        status: raw.status as EmailCampaignStatus,
        ownerId: raw.ownerId,
        steps: [],
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
      },
      new UniqueEntityID(raw.id),
    );
  }

  async findById(id: string) {
    const raw = await this.prisma.emailCampaign.findUnique({ where: { id } });
    return raw ? this.toDomain(raw) : null;
  }

  async findAllByOwner(ownerId: string) {
    const rows = await this.prisma.emailCampaign.findMany({ where: { ownerId }, orderBy: { createdAt: "desc" } });
    return rows.map((r) => this.toDomain(r));
  }

  async save(campaign: EmailCampaign) {
    await this.prisma.emailCampaign.upsert({
      where: { id: campaign.id.toString() },
      create: {
        id: campaign.id.toString(),
        name: campaign.name,
        description: campaign.description,
        fromEmail: campaign.fromEmail,
        status: campaign.status,
        ownerId: campaign.ownerId,
      },
      update: {
        name: campaign.name,
        description: campaign.description,
        fromEmail: campaign.fromEmail,
        status: campaign.status,
        updatedAt: campaign.updatedAt,
      },
    });
  }

  async delete(id: string) {
    await this.prisma.emailCampaign.delete({ where: { id } });
  }
}
