import { Injectable } from "@nestjs/common";
import { Either, right } from "@/core/either";
import { ScheduledEmailSendsRepository } from "../repositories/scheduled-email-sends.repository";

export interface ScheduledEmailListItem {
  id: string;
  activityId: string | null;
  to: string;
  subject: string;
  scheduledSendAt: Date;
  leadId: string | null;
  contactId: string | null;
  organizationId: string | null;
  dealId: string | null;
}

@Injectable()
export class ListScheduledEmailsUseCase {
  constructor(private readonly scheduled: ScheduledEmailSendsRepository) {}

  async execute(ownerId: string): Promise<Either<Error, { items: ScheduledEmailListItem[] }>> {
    const records = await this.scheduled.findPendingByOwner(ownerId);
    const items = records.map((r) => ({
      id: r.id.toString(),
      activityId: r.activityId,
      to: r.to,
      subject: r.subject,
      scheduledSendAt: r.scheduledSendAt,
      leadId: r.leadId,
      contactId: r.contactId,
      organizationId: r.organizationId,
      dealId: r.dealId,
    }));
    return right({ items });
  }
}
