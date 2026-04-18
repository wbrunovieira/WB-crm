import { Injectable } from "@nestjs/common";
import { left, right, type Either } from "@/core/either";
import { ActivitiesRepository } from "../repositories/activities.repository";
import type { Activity } from "../../enterprise/entities/activity";

export interface UpdateActivityInput {
  id: string;
  requesterId: string;
  requesterRole: string;
  type?: string;
  subject?: string;
  description?: string;
  dueDate?: Date | null;
  dealId?: string | null;
  contactIds?: string[];
  leadContactIds?: string[];
  leadId?: string | null;
  organizationId?: string | null;
  partnerId?: string | null;
  callContactType?: string | null;
  meetingNoShow?: boolean;
}

type Output = Either<Error, { activity: Activity }>;

@Injectable()
export class UpdateActivityUseCase {
  constructor(private readonly activities: ActivitiesRepository) {}

  async execute(input: UpdateActivityInput): Promise<Output> {
    const activity = await this.activities.findByIdRaw(input.id);
    if (!activity) return left(new Error("Atividade não encontrada"));

    const isOwner = activity.ownerId === input.requesterId;
    const isAdmin = input.requesterRole === "admin";
    if (!isOwner && !isAdmin) return left(new Error("Não autorizado"));

    const updates: Parameters<typeof activity.update>[0] = {};

    if (input.type !== undefined)        updates.type = input.type;
    if (input.subject !== undefined)     updates.subject = input.subject.trim();
    if (input.description !== undefined) updates.description = input.description;
    if (input.dueDate !== undefined)     updates.dueDate = input.dueDate ?? undefined;
    if (input.dealId !== undefined)      updates.dealId = input.dealId ?? undefined;
    if (input.leadId !== undefined)         updates.leadId = input.leadId ?? undefined;
    if (input.organizationId !== undefined) updates.organizationId = input.organizationId ?? undefined;
    if (input.partnerId !== undefined)      updates.partnerId = input.partnerId ?? undefined;
    if (input.callContactType !== undefined) updates.callContactType = input.callContactType ?? undefined;
    if (input.meetingNoShow !== undefined)   updates.meetingNoShow = input.meetingNoShow;

    if (input.contactIds !== undefined) {
      const ids = input.contactIds ?? [];
      updates.contactId = ids[0] ?? undefined;
      updates.contactIds = ids.length > 0 ? JSON.stringify(ids) : undefined;
    }

    if (input.leadContactIds !== undefined) {
      const ids = input.leadContactIds ?? [];
      updates.leadContactIds = ids.length > 0 ? JSON.stringify(ids) : undefined;
    }

    activity.update(updates);
    await this.activities.save(activity);
    return right({ activity });
  }
}
