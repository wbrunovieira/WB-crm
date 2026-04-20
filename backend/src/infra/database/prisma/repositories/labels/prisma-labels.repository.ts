import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";
import { LabelsRepository } from "@/domain/labels/application/repositories/labels.repository";
import { Label } from "@/domain/labels/enterprise/entities/label";
import { LabelMapper } from "../../mappers/labels/label.mapper";

@Injectable()
export class PrismaLabelsRepository extends LabelsRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findById(id: string): Promise<Label | null> {
    const raw = await this.prisma.label.findUnique({ where: { id } });
    return raw ? LabelMapper.toDomain(raw) : null;
  }

  async findByOwner(ownerId: string): Promise<Label[]> {
    const rows = await this.prisma.label.findMany({
      where: { ownerId },
      orderBy: { name: "asc" },
    });
    return rows.map(LabelMapper.toDomain);
  }

  async existsByNameAndOwner(name: string, ownerId: string): Promise<boolean> {
    const count = await this.prisma.label.count({ where: { name, ownerId } });
    return count > 0;
  }

  async save(label: Label): Promise<void> {
    const data = LabelMapper.toPrisma(label);
    await this.prisma.label.upsert({
      where: { id: data.id },
      create: data,
      update: { name: data.name, color: data.color, updatedAt: data.updatedAt },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.label.delete({ where: { id } });
  }

  async addToLead(labelId: string, leadId: string): Promise<void> {
    await this.prisma.lead.update({
      where: { id: leadId },
      data: { labels: { connect: { id: labelId } } },
    });
  }

  async removeFromLead(labelId: string, leadId: string): Promise<void> {
    await this.prisma.lead.update({
      where: { id: leadId },
      data: { labels: { disconnect: { id: labelId } } },
    });
  }

  async setLeadLabels(leadId: string, labelIds: string[]): Promise<void> {
    await this.prisma.lead.update({
      where: { id: leadId },
      data: { labels: { set: labelIds.map((id) => ({ id })) } },
    });
  }

  async addToOrganization(labelId: string, organizationId: string): Promise<void> {
    await this.prisma.organization.update({
      where: { id: organizationId },
      data: { labels: { connect: { id: labelId } } },
    });
  }

  async removeFromOrganization(labelId: string, organizationId: string): Promise<void> {
    await this.prisma.organization.update({
      where: { id: organizationId },
      data: { labels: { disconnect: { id: labelId } } },
    });
  }

  async setOrganizationLabels(organizationId: string, labelIds: string[]): Promise<void> {
    await this.prisma.organization.update({
      where: { id: organizationId },
      data: { labels: { set: labelIds.map((id) => ({ id })) } },
    });
  }
}
