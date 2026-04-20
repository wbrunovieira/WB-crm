import {
  NotificationsRepository,
  CreateNotificationData,
  NotificationRecord,
} from "@/domain/integrations/lead-research/application/repositories/notifications.repository";

export class FakeNotificationsRepository extends NotificationsRepository {
  public items: NotificationRecord[] = [];
  public adminUserId: string | null = "admin-001";
  private nextId = 1;

  async create(data: CreateNotificationData): Promise<NotificationRecord> {
    const record: NotificationRecord = { id: `notif-${this.nextId++}`, type: data.type, userId: data.userId };
    this.items.push(record);
    return record;
  }

  async findAdminUserId(): Promise<string | null> {
    return this.adminUserId;
  }
}
