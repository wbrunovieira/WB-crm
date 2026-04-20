import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";
import { NotificationsRepository } from "../../application/repositories/notifications.repository";
import { Notification } from "../../enterprise/entities/notification";
import { UniqueEntityID } from "@/core/unique-entity-id";

function toDomain(raw: any): Notification {
  return Notification.create({
    type: raw.type,
    status: raw.status,
    title: raw.title,
    summary: raw.summary,
    read: raw.read,
    userId: raw.userId,
    jobId: raw.jobId ?? undefined,
    payload: raw.payload ?? undefined,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  }, new UniqueEntityID(raw.id)).unwrap();
}

@Injectable()
export class PrismaNotificationsRepository extends NotificationsRepository {
  constructor(private readonly prisma: PrismaService) { super(); }

  async findByUser(userId: string, onlyUnread?: boolean): Promise<Notification[]> {
    const rows = await this.prisma.notification.findMany({
      where: { userId, ...(onlyUnread ? { read: false } : {}) },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toDomain);
  }

  async findById(id: string): Promise<Notification | null> {
    const row = await this.prisma.notification.findUnique({ where: { id } });
    return row ? toDomain(row) : null;
  }

  async save(notification: Notification): Promise<void> {
    await this.prisma.notification.upsert({
      where: { id: notification.id.toString() },
      create: {
        id: notification.id.toString(),
        type: notification.type,
        status: notification.status,
        title: notification.title,
        summary: notification.summary,
        read: notification.read,
        userId: notification.userId,
        jobId: notification.jobId,
        payload: notification.payload,
      },
      update: {
        status: notification.status,
        title: notification.title,
        summary: notification.summary,
        read: notification.read,
        payload: notification.payload,
        updatedAt: notification.updatedAt,
      },
    });
  }

  async markManyAsRead(ids: string[], userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { id: { in: ids }, userId },
      data: { read: true },
    });
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId },
      data: { read: true },
    });
  }

  async countUnread(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, read: false } });
  }
}
