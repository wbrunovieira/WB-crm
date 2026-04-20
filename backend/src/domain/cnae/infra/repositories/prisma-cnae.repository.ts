import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";
import { CnaeRepository, CnaeRecord } from "../../application/repositories/cnae.repository";

@Injectable()
export class PrismaCnaeRepository extends CnaeRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async search(query: string, limit = 20): Promise<CnaeRecord[]> {
    return this.prisma.cNAE.findMany({
      where: {
        OR: [
          { code: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
        ],
      },
      take: limit,
      orderBy: { code: "asc" },
    });
  }

  async findById(id: string): Promise<CnaeRecord | null> {
    return this.prisma.cNAE.findUnique({ where: { id } });
  }

  async addToLead(cnaeId: string, leadId: string): Promise<void> {
    await this.prisma.leadSecondaryCNAE.upsert({
      where: { leadId_cnaeId: { leadId, cnaeId } },
      create: { leadId, cnaeId },
      update: {},
    });
  }

  async removeFromLead(cnaeId: string, leadId: string): Promise<void> {
    await this.prisma.leadSecondaryCNAE.deleteMany({ where: { leadId, cnaeId } });
  }

  async addToOrganization(cnaeId: string, organizationId: string): Promise<void> {
    await this.prisma.organizationSecondaryCNAE.upsert({
      where: { organizationId_cnaeId: { organizationId, cnaeId } },
      create: { organizationId, cnaeId },
      update: {},
    });
  }

  async removeFromOrganization(cnaeId: string, organizationId: string): Promise<void> {
    await this.prisma.organizationSecondaryCNAE.deleteMany({ where: { organizationId, cnaeId } });
  }
}
