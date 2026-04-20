import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";
import {
  NotificationsRepository,
  CreateNotificationData,
  NotificationRecord,
} from "../../application/repositories/notifications.repository";

@Injectable()
export class PrismaNotificationsRepository extends NotificationsRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(data: CreateNotificationData): Promise<NotificationRecord> {
    return this.prisma.notification.create({ data });
  }

  async findAdminUserId(): Promise<string | null> {
    const user = await this.prisma.user.findFirst({
      where: { role: "admin" },
      select: { id: true },
    });
    return user?.id ?? null;
  }
}
