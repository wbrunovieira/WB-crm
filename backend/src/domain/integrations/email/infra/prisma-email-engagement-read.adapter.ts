import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";
import {
  EmailEngagementReadPort,
  EmailEngagementContext,
} from "../application/ports/email-engagement-read.port";

@Injectable()
export class PrismaEmailEngagementReadAdapter extends EmailEngagementReadPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findContextByToken(token: string): Promise<EmailEngagementContext | null> {
    const a = await this.prisma.activity.findFirst({
      where: { emailTrackingToken: token },
      include: {
        lead: { select: { businessName: true } },
        contact: { select: { name: true } },
        organization: { select: { name: true } },
        partner: { select: { name: true } },
      },
    });
    if (!a) return null;

    const recipientName =
      a.lead?.businessName ??
      a.contact?.name ??
      a.organization?.name ??
      a.partner?.name ??
      null;

    return {
      activityId: a.id,
      ownerId: a.ownerId,
      isCampaign: Boolean(a.emailCampaignId) || a.type === "campaign_email",
      subject: a.emailSubject ?? a.subject ?? null,
      recipientName,
      leadId: a.leadId ?? undefined,
      organizationId: a.organizationId ?? undefined,
      contactId: a.contactId ?? undefined,
      partnerId: a.partnerId ?? undefined,
    };
  }
}
