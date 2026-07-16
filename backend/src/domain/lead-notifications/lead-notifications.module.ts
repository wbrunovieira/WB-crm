import { Module } from "@nestjs/common";
import { NotificationsModule } from "@/domain/notifications/notifications.module";
import { EmailModule } from "@/domain/integrations/email/email.module";
import { NotifyNewBotLeadUseCase } from "./application/use-cases/notify-new-bot-lead.use-case";
import { BotLeadCreatedListener } from "./infra/listeners/bot-lead-created.listener";

/**
 * Alerts the human owner (bell + email) when the Bot Prospector creates a lead.
 * Listens to the global "lead.created" event, so it depends on Email/Notifications
 * WITHOUT importing LeadsModule (which EmailModule already imports — would cycle).
 */
@Module({
  imports: [NotificationsModule, EmailModule],
  providers: [NotifyNewBotLeadUseCase, BotLeadCreatedListener],
})
export class LeadNotificationsModule {}
