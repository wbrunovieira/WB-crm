import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";
import { WhatsAppTemplatesRepository, WhatsAppTemplateRecord } from "../application/repositories/whatsapp-templates.repository";

@Injectable()
export class PrismaWhatsAppTemplatesRepository extends WhatsAppTemplatesRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findAll(onlyActive = false): Promise<WhatsAppTemplateRecord[]> {
    return this.prisma.whatsAppTemplate.findMany({
      where: onlyActive ? { active: true } : undefined,
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
  }

  async create(data: { name: string; text: string; category?: string }): Promise<WhatsAppTemplateRecord> {
    return this.prisma.whatsAppTemplate.create({
      data: { name: data.name, text: data.text, category: data.category ?? null },
    });
  }

  async update(id: string, data: { name?: string; text?: string; category?: string; active?: boolean }): Promise<WhatsAppTemplateRecord> {
    return this.prisma.whatsAppTemplate.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.text !== undefined && { text: data.text }),
        ...(data.category !== undefined && { category: data.category || null }),
        ...(data.active !== undefined && { active: data.active }),
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.whatsAppTemplate.delete({ where: { id } });
  }
}
