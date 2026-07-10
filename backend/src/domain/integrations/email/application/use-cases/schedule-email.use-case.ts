import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { ScheduledEmailSendsRepository } from "../repositories/scheduled-email-sends.repository";
import { ScheduledEmailSend, ScheduledEmailAttachment } from "../../enterprise/entities/scheduled-email-send";
import { EmailAddress } from "../../enterprise/value-objects/email-address.vo";
import { CreateActivityUseCase } from "@/domain/activities/application/use-cases/create-activity.use-case";

export interface ScheduleEmailInput {
  ownerId: string;
  to: string;
  subject: string;
  bodyHtml: string;
  scheduledSendAt: Date; // instante UTC (o frontend converte do fuso local)
  fromEmail?: string;
  threadId?: string;
  attachments?: ScheduledEmailAttachment[];
  leadId?: string;
  contactIds?: string[];
  organizationId?: string;
  partnerId?: string;
  dealId?: string;
}

export interface ScheduleEmailOutput {
  scheduledEmailId: string;
  activityId: string | null;
  scheduledSendAt: Date;
}

@Injectable()
export class ScheduleEmailUseCase {
  constructor(
    private readonly scheduled: ScheduledEmailSendsRepository,
    private readonly createActivity: CreateActivityUseCase,
  ) {}

  async execute(input: ScheduleEmailInput, now: Date = new Date()): Promise<Either<Error, ScheduleEmailOutput>> {
    const subject = input.subject?.trim();
    if (!subject) return left(new Error("Assunto é obrigatório"));
    if (!input.bodyHtml?.trim()) return left(new Error("Mensagem é obrigatória"));

    const emailResult = EmailAddress.create(input.to);
    if (emailResult.isLeft()) return left(emailResult.value);
    const to = emailResult.value.value;

    if (!(input.scheduledSendAt instanceof Date) || isNaN(input.scheduledSendAt.getTime())) {
      return left(new Error("Data de agendamento inválida"));
    }
    if (input.scheduledSendAt.getTime() <= now.getTime()) {
      return left(new Error("A data de agendamento deve ser no futuro"));
    }

    const contactIds = input.contactIds?.filter(Boolean) ?? [];

    // Atividade "agendada": concluída só quando enviada (ícone de relógio enquanto pendente).
    const bodyPreview = input.bodyHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 500);
    const activityResult = await this.createActivity.execute({
      ownerId: input.ownerId,
      type: "email",
      subject,
      description: bodyPreview,
      completed: false,
      scheduledSendAt: input.scheduledSendAt,
      dueDate: input.scheduledSendAt,
      emailSubject: subject,
      contactIds,
      leadId: input.leadId,
      organizationId: input.organizationId,
      partnerId: input.partnerId,
      dealId: input.dealId,
    });
    if (activityResult.isLeft()) return left(activityResult.value);
    const activityId = activityResult.value.activity.id.toString();

    const scheduled = ScheduledEmailSend.create({
      ownerId: input.ownerId,
      activityId,
      scheduledSendAt: input.scheduledSendAt,
      to,
      subject,
      bodyHtml: input.bodyHtml,
      fromEmail: input.fromEmail ?? null,
      threadId: input.threadId ?? null,
      attachments: input.attachments ?? [],
      leadId: input.leadId ?? null,
      contactId: contactIds[0] ?? null,
      contactIds,
      organizationId: input.organizationId ?? null,
      dealId: input.dealId ?? null,
    });
    await this.scheduled.save(scheduled);

    return right({ scheduledEmailId: scheduled.id.toString(), activityId, scheduledSendAt: input.scheduledSendAt });
  }
}
