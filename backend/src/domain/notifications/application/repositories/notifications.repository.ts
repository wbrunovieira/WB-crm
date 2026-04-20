import { Notification } from "../../enterprise/entities/notification";

export abstract class NotificationsRepository {
  abstract findByUser(userId: string, onlyUnread?: boolean): Promise<Notification[]>;
  abstract findById(id: string): Promise<Notification | null>;
  abstract save(notification: Notification): Promise<void>;
  abstract markManyAsRead(ids: string[], userId: string): Promise<void>;
  abstract markAllAsRead(userId: string): Promise<void>;
  abstract countUnread(userId: string): Promise<number>;
}
