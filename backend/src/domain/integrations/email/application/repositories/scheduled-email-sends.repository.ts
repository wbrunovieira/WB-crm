import { ScheduledEmailSend } from "../../enterprise/entities/scheduled-email-send";

export abstract class ScheduledEmailSendsRepository {
  abstract save(scheduled: ScheduledEmailSend): Promise<void>;
  abstract findById(id: string): Promise<ScheduledEmailSend | null>;
  /** O agendamento vinculado a uma atividade (activityId é @unique). */
  abstract findByActivityId(activityId: string): Promise<ScheduledEmailSend | null>;
  /** PENDING com scheduledSendAt <= now, ordenados por scheduledSendAt asc. */
  abstract findDue(now: Date, limit: number): Promise<ScheduledEmailSend[]>;
  /** PENDING vinculados a um lead ou contato (para cancelar quando ele responde). */
  abstract findPendingByLeadOrContact(input: { leadId?: string | null; contactId?: string | null }): Promise<ScheduledEmailSend[]>;
  /** PENDING de um owner, ordenados por scheduledSendAt asc (para a tela "agendados"). */
  abstract findPendingByOwner(ownerId: string): Promise<ScheduledEmailSend[]>;
}
