import { Either, left, right } from "@/core/either";

export type WhatsAppMessageTypeValue =
  | "conversation"
  | "extendedTextMessage"
  | "audioMessage"
  | "videoMessage"
  | "imageMessage"
  | "documentMessage"
  | "stickerMessage"
  | "locationMessage";

const VALID_TYPES: WhatsAppMessageTypeValue[] = [
  "conversation",
  "extendedTextMessage",
  "audioMessage",
  "videoMessage",
  "imageMessage",
  "documentMessage",
  "stickerMessage",
  "locationMessage",
];

const DOWNLOADABLE_TYPES: WhatsAppMessageTypeValue[] = [
  "audioMessage",
  "videoMessage",
  "imageMessage",
  "documentMessage",
];

const TRANSCRIBABLE_TYPES: WhatsAppMessageTypeValue[] = [
  "audioMessage",
  "videoMessage",
];

export class InvalidMessageTypeError extends Error {
  constructor(raw: string) {
    super(`Invalid WhatsApp message type: "${raw}"`);
    this.name = "InvalidMessageTypeError";
  }
}

export class WhatsAppMessageType {
  private constructor(private readonly _value: WhatsAppMessageTypeValue) {}

  static create(raw: string): Either<InvalidMessageTypeError, WhatsAppMessageType> {
    if (!VALID_TYPES.includes(raw as WhatsAppMessageTypeValue)) {
      return left(new InvalidMessageTypeError(raw));
    }
    return right(new WhatsAppMessageType(raw as WhatsAppMessageTypeValue));
  }

  /** True for audio, video, image, and document messages. */
  isDownloadable(): boolean {
    return DOWNLOADABLE_TYPES.includes(this._value);
  }

  /** True for audio and video messages only. */
  isTranscribable(): boolean {
    return TRANSCRIBABLE_TYPES.includes(this._value);
  }

  toString(): WhatsAppMessageTypeValue {
    return this._value;
  }
}
