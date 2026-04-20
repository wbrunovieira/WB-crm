import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";
import {
  LeadContactsRepository,
  LeadContactRecord,
  CreateLeadContactData,
  UpdateLeadContactData,
} from "@/domain/leads/application/repositories/lead-contacts.repository";

@Injectable()
export class PrismaLeadContactsRepository extends LeadContactsRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findByLead(leadId: string): Promise<LeadContactRecord[]> {
    const rows = await this.prisma.leadContact.findMany({
      where: { leadId },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    });
    return rows.map(this.toRecord);
  }

  async findById(id: string): Promise<LeadContactRecord | null> {
    const row = await this.prisma.leadContact.findUnique({ where: { id } });
    return row ? this.toRecord(row) : null;
  }

  async create(data: CreateLeadContactData): Promise<LeadContactRecord> {
    const row = await this.prisma.leadContact.create({
      data: {
        leadId: data.leadId,
        name: data.name,
        role: data.role,
        email: data.email,
        phone: data.phone,
        whatsapp: data.whatsapp,
        linkedin: data.linkedin,
        instagram: data.instagram,
        isPrimary: data.isPrimary ?? false,
        languages: data.languages,
      },
    });
    return this.toRecord(row);
  }

  async update(id: string, data: UpdateLeadContactData): Promise<LeadContactRecord> {
    const row = await this.prisma.leadContact.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.role !== undefined && { role: data.role }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.whatsapp !== undefined && { whatsapp: data.whatsapp }),
        ...(data.linkedin !== undefined && { linkedin: data.linkedin }),
        ...(data.instagram !== undefined && { instagram: data.instagram }),
        ...(data.isPrimary !== undefined && { isPrimary: data.isPrimary }),
        ...(data.languages !== undefined && { languages: data.languages }),
        updatedAt: new Date(),
      },
    });
    return this.toRecord(row);
  }

  async toggleActive(id: string): Promise<LeadContactRecord> {
    const current = await this.prisma.leadContact.findUniqueOrThrow({ where: { id } });
    const row = await this.prisma.leadContact.update({
      where: { id },
      data: { isActive: !current.isActive, updatedAt: new Date() },
    });
    return this.toRecord(row);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.leadContact.delete({ where: { id } });
  }

  private toRecord(row: {
    id: string;
    leadId: string;
    name: string;
    role: string | null;
    email: string | null;
    phone: string | null;
    whatsapp: string | null;
    linkedin: string | null;
    instagram: string | null;
    isPrimary: boolean;
    isActive: boolean;
    languages: string | null;
    convertedToContactId: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): LeadContactRecord {
    return {
      id: row.id,
      leadId: row.leadId,
      name: row.name,
      role: row.role,
      email: row.email,
      phone: row.phone,
      whatsapp: row.whatsapp,
      linkedin: row.linkedin,
      instagram: row.instagram,
      isPrimary: row.isPrimary,
      isActive: row.isActive,
      languages: row.languages,
      convertedToContactId: row.convertedToContactId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
