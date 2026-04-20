import { Either, left, right } from "@/core/either";

export type NotificationStatusValue = "pending" | "completed" | "error";

export class NotificationStatusError extends Error { name = "NotificationStatusError"; }

export class NotificationStatus {
  private constructor(private readonly _value: NotificationStatusValue) {}
  get value(): NotificationStatusValue { return this._value; }

  static create(raw: string): Either<NotificationStatusError, NotificationStatus> {
    const valid: NotificationStatusValue[] = ["pending", "completed", "error"];
    if (!valid.includes(raw as NotificationStatusValue)) {
      return left(new NotificationStatusError(`Status inválido: ${raw}`));
    }
    return right(new NotificationStatus(raw as NotificationStatusValue));
  }

  static pending(): NotificationStatus { return new NotificationStatus("pending"); }
  static completed(): NotificationStatus { return new NotificationStatus("completed"); }
  static error(): NotificationStatus { return new NotificationStatus("error"); }
}
