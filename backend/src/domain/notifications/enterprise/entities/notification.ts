import { AggregateRoot } from "@/core/aggregate-root";
import { UniqueEntityID } from "@/core/unique-entity-id";
import { Either, left, right } from "@/core/either";
import { NotificationType, NotificationTypeValue } from "../value-objects/notification-type.vo";
import { NotificationStatus, NotificationStatusValue } from "../value-objects/notification-status.vo";

export interface NotificationProps {
  type: NotificationType;
  status: NotificationStatus;
  title: string;
  summary: string;
  read: boolean;
  userId: string;
  jobId?: string;
  payload?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class NotificationTitleError extends Error { name = "NotificationTitleError"; }

export class Notification extends AggregateRoot<NotificationProps> {
  get type(): NotificationTypeValue { return this.props.type.value; }
  get status(): NotificationStatusValue { return this.props.status.value; }
  get title(): string { return this.props.title; }
  get summary(): string { return this.props.summary; }
  get read(): boolean { return this.props.read; }
  get userId(): string { return this.props.userId; }
  get jobId(): string | undefined { return this.props.jobId; }
  get payload(): string | undefined { return this.props.payload; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  static create(data: {
    type: string;
    status?: string;
    title: string;
    summary: string;
    read?: boolean;
    userId: string;
    jobId?: string;
    payload?: string;
    createdAt?: Date;
    updatedAt?: Date;
  }, id?: UniqueEntityID): Either<Error, Notification> {
    const trimmedTitle = data.title.trim();
    if (!trimmedTitle) return left(new NotificationTitleError("title não pode ser vazio"));

    const typeResult = NotificationType.create(data.type);
    if (typeResult.isLeft()) return left(typeResult.value);

    const statusResult: Either<Error, NotificationStatus> = data.status
      ? NotificationStatus.create(data.status)
      : right(NotificationStatus.pending());
    if (statusResult.isLeft()) return left(statusResult.value);

    const now = new Date();
    return right(new Notification({
      type: typeResult.value as NotificationType,
      status: statusResult.value as NotificationStatus,
      title: trimmedTitle,
      summary: data.summary,
      read: data.read ?? false,
      userId: data.userId,
      jobId: data.jobId,
      payload: data.payload,
      createdAt: data.createdAt ?? now,
      updatedAt: data.updatedAt ?? now,
    }, id));
  }

  markAsRead(): void {
    this.props.read = true;
    this.props.updatedAt = new Date();
  }
}
