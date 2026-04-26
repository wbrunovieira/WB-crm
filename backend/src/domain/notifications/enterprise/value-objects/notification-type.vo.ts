import { Either, left, right } from "@/core/either";

export type NotificationTypeValue =
  | "LEAD_RESEARCH_COMPLETE"
  | "LEAD_RESEARCH_ERROR"
  | "CALL_TRANSCRIBED"
  | "WHATSAPP_TRANSCRIBED"
  | "WHATSAPP_MESSAGE"
  | "EMAIL_RECEIVED"
  | "MEETING_ENDED"
  | "GENERIC";

const VALID: NotificationTypeValue[] = [
  "LEAD_RESEARCH_COMPLETE",
  "LEAD_RESEARCH_ERROR",
  "CALL_TRANSCRIBED",
  "WHATSAPP_TRANSCRIBED",
  "WHATSAPP_MESSAGE",
  "EMAIL_RECEIVED",
  "MEETING_ENDED",
  "GENERIC",
];

export class NotificationTypeError extends Error { name = "NotificationTypeError"; }

export class NotificationType {
  private constructor(private readonly _value: NotificationTypeValue) {}
  get value(): NotificationTypeValue { return this._value; }

  static create(raw: string): Either<NotificationTypeError, NotificationType> {
    if (!VALID.includes(raw as NotificationTypeValue)) {
      return left(new NotificationTypeError(`Tipo inválido: ${raw}`));
    }
    return right(new NotificationType(raw as NotificationTypeValue));
  }

  static generic(): NotificationType { return new NotificationType("GENERIC"); }
}
