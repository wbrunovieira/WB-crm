import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";
import { RecipientContextPort, RecipientContext } from "@/domain/email-campaigns/application/ports/recipient-context.port";

@Injectable()
export class PrismaRecipientContextAdapter extends RecipientContextPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async resolve(recipientType: string, recipientId: string): Promise<RecipientContext> {
    if (recipientType === "LEAD") {
      const lead = await this.prisma.lead.findUnique({ where: { id: recipientId }, select: { id: true } });
      if (lead) return { leadId: recipientId };

      // LeadContact enrolled with type "LEAD" (see bulk-enroll)
      const lc = await this.prisma.leadContact.findUnique({ where: { id: recipientId }, select: { leadId: true } });
      if (lc) return { leadId: lc.leadId };

      return {};
    }

    if (recipientType === "CONTACT") {
      const contact = await this.prisma.contact.findUnique({
        where: { id: recipientId },
        select: { id: true, leadId: true, organizationId: true, partnerId: true },
      });
      if (contact) {
        return {
          contactId: contact.id,
          leadId: contact.leadId ?? undefined,
          organizationId: contact.organizationId ?? undefined,
          partnerId: contact.partnerId ?? undefined,
        };
      }

      // Organization enrolled as CONTACT (org's own email)
      const org = await this.prisma.organization.findUnique({ where: { id: recipientId }, select: { id: true } });
      if (org) return { organizationId: recipientId };

      // Partner enrolled as CONTACT (partner's own email)
      const partner = await this.prisma.partner.findUnique({ where: { id: recipientId }, select: { id: true } });
      if (partner) return { partnerId: recipientId };

      return {};
    }

    return {};
  }
}
