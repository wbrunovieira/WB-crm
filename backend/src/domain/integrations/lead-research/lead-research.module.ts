import { Module } from "@nestjs/common";
import { NotificationsRepository } from "./application/repositories/notifications.repository";
import { CreateLeadResearchNotificationUseCase } from "./application/use-cases/create-lead-research-notification.use-case";
import { LeadResearchWebhookController } from "./infra/controllers/lead-research-webhook.controller";
import { PrismaNotificationsRepository } from "./infra/repositories/prisma-notifications.repository";

@Module({
  controllers: [LeadResearchWebhookController],
  providers: [
    CreateLeadResearchNotificationUseCase,
    { provide: NotificationsRepository, useClass: PrismaNotificationsRepository },
  ],
})
export class LeadResearchModule {}
