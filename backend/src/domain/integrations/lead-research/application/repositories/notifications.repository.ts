export interface CreateNotificationData {
  type: string;
  jobId: string;
  status: string;
  title: string;
  summary: string;
  payload: string;
  userId: string;
}

export interface NotificationRecord {
  id: string;
  type: string;
  userId: string;
}

export abstract class NotificationsRepository {
  abstract create(data: CreateNotificationData): Promise<NotificationRecord>;
  abstract findAdminUserId(): Promise<string | null>;
}
