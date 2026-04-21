import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";
import { LeadDropdownOptionsRepository, type LeadDropdownOptionRecord } from "@/domain/leads/application/repositories/lead-dropdown-options.repository";

@Injectable()
export class PrismaLeadDropdownOptionsRepository extends LeadDropdownOptionsRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findByCategory(ownerId: string, category: string): Promise<LeadDropdownOptionRecord[]> {
    const rows = await this.prisma.leadDropdownOption.findMany({
      where: { ownerId, category },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, category: true, ownerId: true, createdAt: true },
    });
    return rows;
  }

  async create(data: { name: string; category: string; ownerId: string }): Promise<LeadDropdownOptionRecord> {
    return this.prisma.leadDropdownOption.create({ data });
  }
}
