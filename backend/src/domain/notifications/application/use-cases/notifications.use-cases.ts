import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { NotificationsRepository } from "../repositories/notifications.repository";
import { Notification } from "../../enterprise/entities/notification";

export class NotificationNotFoundError extends Error { name = "NotificationNotFoundError"; }

@Injectable()
export class GetNotificationsUseCase {
  constructor(private readonly repo: NotificationsRepository) {}

  async execute(input: {
    requesterId: string;
    onlyUnread?: boolean;
  }): Promise<Either<Error, { notifications: Notification[]; unreadCount: number }>> {
    const notifications = await this.repo.findByUser(input.requesterId, input.onlyUnread);
    const unreadCount = notifications.filter(n => !n.read).length;
    return right({ notifications, unreadCount });
  }
}

@Injectable()
export class CreateNotificationUseCase {
  constructor(private readonly repo: NotificationsRepository) {}

  async execute(input: {
    type: string;
    status?: string;
    title: string;
    summary: string;
    userId: string;
    jobId?: string;
    payload?: string;
  }): Promise<Either<Error, Notification>> {
    const result = Notification.create(input);
    if (result.isLeft()) return left(result.value);

    const notification = result.value as Notification;
    await this.repo.save(notification);
    return right(notification);
  }
}

@Injectable()
export class MarkNotificationsReadUseCase {
  constructor(private readonly repo: NotificationsRepository) {}

  async execute(input: {
    requesterId: string;
    ids?: string[];
    all?: boolean;
  }): Promise<Either<Error, void>> {
    if (input.all) {
      await this.repo.markAllAsRead(input.requesterId);
    } else if (input.ids && input.ids.length > 0) {
      await this.repo.markManyAsRead(input.ids, input.requesterId);
    }
    return right(undefined);
  }
}
