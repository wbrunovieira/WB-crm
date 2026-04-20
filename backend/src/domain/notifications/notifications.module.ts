import { Module } from "@nestjs/common";
import { AuthModule } from "@/infra/auth/auth.module";
import { NotificationsRepository } from "./application/repositories/notifications.repository";
import { PrismaNotificationsRepository } from "./infra/repositories/prisma-notifications.repository";
import {
  GetNotificationsUseCase,
  CreateNotificationUseCase,
  MarkNotificationsReadUseCase,
} from "./application/use-cases/notifications.use-cases";
import { NotificationsController } from "./infra/controllers/notifications.controller";
import { NotificationsEventBus } from "./application/ports/notifications-event-bus";

@Module({
  imports: [AuthModule],
  controllers: [NotificationsController],
  providers: [
    { provide: NotificationsRepository, useClass: PrismaNotificationsRepository },
    GetNotificationsUseCase,
    CreateNotificationUseCase,
    MarkNotificationsReadUseCase,
    NotificationsEventBus,
  ],
  exports: [CreateNotificationUseCase, NotificationsEventBus],
})
export class NotificationsModule {}
