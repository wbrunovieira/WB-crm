import { Injectable } from "@nestjs/common";
import { NotificationsRepository } from "../repositories/notifications.repository";

export interface LeadResearchPayload {
  jobId: string;
  status: "completed" | "error";
  createdLeads?: Array<{
    lead: { id: string; businessName: string; [key: string]: unknown };
    contacts: Array<{ id: string; name: string; [key: string]: unknown }>;
  }>;
  rejected?: Array<{ queryTerm: string; reason: string }>;
  summary: string;
  error?: string;
  ownerId?: string;
}

export interface CreateLeadResearchNotificationResult {
  notificationId: string;
  userId: string;
}

@Injectable()
export class CreateLeadResearchNotificationUseCase {
  constructor(private readonly notifications: NotificationsRepository) {}

  async execute(
    payload: LeadResearchPayload,
  ): Promise<CreateLeadResearchNotificationResult | null> {
    let userId = payload.ownerId;

    if (!userId) {
      const adminId = await this.notifications.findAdminUserId();
      if (!adminId) return null;
      userId = adminId;
    }

    const isError = payload.status === "error";
    const leadsCount = payload.createdLeads?.length ?? 0;

    const notification = await this.notifications.create({
      type: isError ? "LEAD_RESEARCH_ERROR" : "LEAD_RESEARCH_COMPLETE",
      jobId: payload.jobId,
      status: payload.status,
      title: isError ? "Pesquisa de leads falhou" : `${leadsCount} lead(s) criado(s)`,
      summary: payload.summary,
      payload: JSON.stringify(payload),
      userId,
    });

    return { notificationId: notification.id, userId };
  }
}
