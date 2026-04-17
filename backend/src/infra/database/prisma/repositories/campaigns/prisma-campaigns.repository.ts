import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";
import { CampaignsRepository } from "@/domain/campaigns/application/repositories/campaigns.repository";
import type { Campaign } from "@/domain/campaigns/enterprise/entities/campaign";
import { CampaignMapper } from "../../mappers/campaigns/campaign.mapper";

@Injectable()
export class PrismaCampaignsRepository extends CampaignsRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findById(id: string): Promise<Campaign | null> {
    const raw = await this.prisma.campaign.findUnique({
      where: { id },
      include: { steps: { orderBy: { order: "asc" } } },
    });
    return raw ? CampaignMapper.toDomain(raw) : null;
  }

  async findManyByOwner(ownerId: string): Promise<Campaign[]> {
    const rows = await this.prisma.campaign.findMany({
      where: { ownerId },
      include: { steps: { orderBy: { order: "asc" } } },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(CampaignMapper.toDomain);
  }

  async save(campaign: Campaign): Promise<void> {
    const data = CampaignMapper.toPrisma(campaign);
    await this.prisma.campaign.upsert({
      where: { id: data.id },
      create: data,
      update: data,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.campaign.delete({ where: { id } });
  }
}
