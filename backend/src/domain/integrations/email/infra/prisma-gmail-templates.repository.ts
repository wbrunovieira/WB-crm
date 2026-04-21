import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";
import { GmailTemplatesRepository, GmailTemplateRecord } from "../application/repositories/gmail-templates.repository";

@Injectable()
export class PrismaGmailTemplatesRepository extends GmailTemplatesRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findAll(onlyActive = false): Promise<GmailTemplateRecord[]> {
    return this.prisma.gmailTemplate.findMany({
      where: onlyActive ? { active: true } : undefined,
      orderBy: [{ active: "desc" }, { name: "asc" }],
    });
  }

  async create(data: { name: string; subject: string; body: string; category?: string }): Promise<GmailTemplateRecord> {
    return this.prisma.gmailTemplate.create({
      data: { name: data.name, subject: data.subject, body: data.body, category: data.category ?? null },
    });
  }

  async update(id: string, data: { name?: string; subject?: string; body?: string; category?: string; active?: boolean }): Promise<GmailTemplateRecord> {
    return this.prisma.gmailTemplate.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.subject !== undefined && { subject: data.subject }),
        ...(data.body !== undefined && { body: data.body }),
        ...(data.category !== undefined && { category: data.category || null }),
        ...(data.active !== undefined && { active: data.active }),
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.gmailTemplate.delete({ where: { id } });
  }
}
