import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";
import { CampaignSendsRepository } from "@/domain/campaigns/application/repositories/campaign-sends.repository";
import type { CampaignSend } from "@/domain/campaigns/enterprise/entities/campaign-send";
import { CampaignSendMapper } from "../../mappers/campaigns/campaign-send.mapper";

@Injectable()
export class PrismaCampaignSendsRepository extends CampaignSendsRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findById(id: string): Promise<CampaignSend | null> {
    const raw = await this.prisma.campaignSend.findUnique({ where: { id } });
    return raw ? CampaignSendMapper.toDomain(raw) : null;
  }

  async findManyByCampaign(campaignId: string): Promise<CampaignSend[]> {
    const rows = await this.prisma.campaignSend.findMany({
      where: { campaignId },
      orderBy: { id: "asc" },
    });
    return rows.map(CampaignSendMapper.toDomain);
  }

  async findDueForExecution(limit: number): Promise<CampaignSend[]> {
    const now = new Date();
    const rows = await this.prisma.campaignSend.findMany({
      where: {
        status: { in: ["PENDING", "RUNNING"] },
        OR: [{ scheduledAt: null }, { scheduledAt: { lte: now } }],
        campaign: { status: "ACTIVE" },
      },
      orderBy: { scheduledAt: "asc" },
      take: limit,
    });
    return rows.map(CampaignSendMapper.toDomain);
  }

  async save(send: CampaignSend): Promise<void> {
    const data = CampaignSendMapper.toPrisma(send);
    await this.prisma.campaignSend.upsert({
      where: { id: data.id },
      create: data,
      update: data,
    });
  }

  async saveMany(sends: CampaignSend[]): Promise<void> {
    await Promise.all(sends.map((s) => this.save(s)));
  }

  async countByCampaign(campaignId: string): Promise<number> {
    return this.prisma.campaignSend.count({ where: { campaignId } });
  }
}
