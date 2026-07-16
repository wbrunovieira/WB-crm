import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { LeadCreatedEvent, LEAD_CREATED_EVENT } from "@/domain/leads/enterprise/events/lead-created.event";
import { NotifyNewBotLeadUseCase } from "../../application/use-cases/notify-new-bot-lead.use-case";

/**
 * Reads the notify config from env (feature is off unless all three are set):
 *   NEW_LEAD_NOTIFY_BOT_USER_ID  — only leads created by this user notify
 *   NEW_LEAD_NOTIFY_TO_USER_ID   — bell recipient
 *   NEW_LEAD_NOTIFY_TO_EMAIL     — email recipient
 */
@Injectable()
export class BotLeadCreatedListener {
  private readonly logger = new Logger(BotLeadCreatedListener.name);

  constructor(private readonly notify: NotifyNewBotLeadUseCase) {}

  @OnEvent(LEAD_CREATED_EVENT)
  async handle(event: LeadCreatedEvent): Promise<void> {
    const botUserId = process.env.NEW_LEAD_NOTIFY_BOT_USER_ID;
    const recipientUserId = process.env.NEW_LEAD_NOTIFY_TO_USER_ID;
    const recipientEmail = process.env.NEW_LEAD_NOTIFY_TO_EMAIL;
    if (!botUserId || !recipientUserId || !recipientEmail) return; // feature disabled

    try {
      await this.notify.execute({
        creatorId: event.payload.creatorId,
        leadId: event.payload.leadId,
        businessName: event.payload.businessName,
        botUserId,
        recipientUserId,
        recipientEmail,
      });
    } catch (err) {
      this.logger.warn(
        `Falha ao notificar novo lead do bot (${event.payload.leadId}): ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
