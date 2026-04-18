import { Injectable } from "@nestjs/common";
import { left, right, type Either } from "@/core/either";
import { ActivitiesRepository } from "../repositories/activities.repository";
import { Activity } from "../../enterprise/entities/activity";

export interface CreateActivityInput {
  ownerId: string;
  type: string;
  subject: string;
  description?: string;
  dueDate?: Date;
  dealId?: string;
  contactIds?: string[]; // array — converted to JSON + primary
  leadContactIds?: string[]; // array — converted to JSON
  leadId?: string;
  partnerId?: string;
  callContactType?: string;
  meetingNoShow?: boolean;
}

type Output = Either<Error, { activity: Activity }>;

@Injectable()
export class CreateActivityUseCase {
  constructor(private readonly activities: ActivitiesRepository) {}

  async execute(input: CreateActivityInput): Promise<Output> {
    if (!input.type?.trim()) return left(new Error("Tipo da atividade é obrigatório"));
    if (!input.subject?.trim()) return left(new Error("Assunto da atividade é obrigatório"));

    const contactIds = input.contactIds && input.contactIds.length > 0
      ? input.contactIds
      : [];

    const activity = Activity.create({
      ownerId: input.ownerId,
      type: input.type,
      subject: input.subject.trim(),
      description: input.description,
      dueDate: input.dueDate,
      completed: false,
      meetingNoShow: input.meetingNoShow ?? false,
      emailReplied: false,
      emailOpenCount: 0,
      emailLinkClickCount: 0,
      dealId: input.dealId,
      contactId: contactIds[0] ?? undefined, // primary contact
      contactIds: contactIds.length > 0 ? JSON.stringify(contactIds) : undefined,
      leadContactIds: input.leadContactIds && input.leadContactIds.length > 0
        ? JSON.stringify(input.leadContactIds)
        : undefined,
      leadId: input.leadId,
      partnerId: input.partnerId,
      callContactType: input.callContactType,
    });

    await this.activities.save(activity);
    return right({ activity });
  }
}
