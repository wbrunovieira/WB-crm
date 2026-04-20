import { NotificationsRepository } from "@/domain/notifications/application/repositories/notifications.repository";
import { Notification } from "@/domain/notifications/enterprise/entities/notification";

export class InMemoryNotificationsRepository extends NotificationsRepository {
  notifications: Notification[] = [];

  async findByUser(userId: string, onlyUnread?: boolean): Promise<Notification[]> {
    return this.notifications.filter(n => {
      if (n.userId !== userId) return false;
      if (onlyUnread) return !n.read;
      return true;
    });
  }

  async findById(id: string): Promise<Notification | null> {
    return this.notifications.find(n => n.id.toString() === id) ?? null;
  }

  async save(notification: Notification): Promise<void> {
    const idx = this.notifications.findIndex(n => n.id.equals(notification.id));
    if (idx >= 0) {
      this.notifications[idx] = notification;
    } else {
      this.notifications.push(notification);
    }
  }

  async markManyAsRead(ids: string[], userId: string): Promise<void> {
    this.notifications.forEach(n => {
      if (ids.includes(n.id.toString()) && n.userId === userId) {
        n.markAsRead();
      }
    });
  }

  async markAllAsRead(userId: string): Promise<void> {
    this.notifications.forEach(n => {
      if (n.userId === userId) n.markAsRead();
    });
  }

  async countUnread(userId: string): Promise<number> {
    return this.notifications.filter(n => n.userId === userId && !n.read).length;
  }
}
