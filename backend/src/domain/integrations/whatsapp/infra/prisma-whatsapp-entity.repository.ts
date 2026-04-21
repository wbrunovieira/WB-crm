import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";
import {
  WhatsAppEntityRepository,
  WhatsAppVerificationData,
} from "../application/repositories/whatsapp-entity.repository";

@Injectable()
export class PrismaWhatsAppEntityRepository extends WhatsAppEntityRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async updateLeadVerification(leadId: string, ownerId: string, data: WhatsAppVerificationData): Promise<boolean> {
    const lead = await this.prisma.lead.findFirst({ where: { id: leadId, ownerId }, select: { id: true } });
    if (!lead) return false;
    await this.prisma.lead.update({ where: { id: leadId }, data });
    return true;
  }

  async updateContactVerification(contactId: string, ownerId: string, data: WhatsAppVerificationData): Promise<boolean> {
    const contact = await this.prisma.contact.findFirst({ where: { id: contactId, ownerId }, select: { id: true } });
    if (!contact) return false;
    await this.prisma.contact.update({ where: { id: contactId }, data });
    return true;
  }

  async updateLeadNumber(leadId: string, ownerId: string, whatsapp: string): Promise<boolean> {
    const lead = await this.prisma.lead.findFirst({ where: { id: leadId, ownerId }, select: { id: true } });
    if (!lead) return false;
    await this.prisma.lead.update({ where: { id: leadId }, data: { whatsapp } });
    return true;
  }

  async updateContactNumber(contactId: string, ownerId: string, whatsapp: string): Promise<boolean> {
    const contact = await this.prisma.contact.findFirst({ where: { id: contactId, ownerId }, select: { id: true } });
    if (!contact) return false;
    await this.prisma.contact.update({ where: { id: contactId }, data: { whatsapp } });
    return true;
  }
}
