import { Either, left, right } from "@/core/either";

export class InvalidJidError extends Error {
  constructor(raw: string) {
    super(`Invalid WhatsApp JID: "${raw}"`);
    this.name = "InvalidJidError";
  }
}

export class WhatsAppJid {
  private constructor(private readonly _raw: string) {}

  static create(raw: string): Either<InvalidJidError, WhatsAppJid> {
    if (!raw || raw.trim().length === 0) {
      return left(new InvalidJidError(raw));
    }
    return right(new WhatsAppJid(raw.trim()));
  }

  /** Returns true if this JID belongs to a group chat. */
  isGroup(): boolean {
    return this._raw.endsWith("@g.us");
  }

  /** Extracts the digits before the '@' sign. */
  extractPhone(): string {
    const atIndex = this._raw.indexOf("@");
    if (atIndex === -1) return this._raw.replace(/\D/g, "");
    return this._raw.slice(0, atIndex).replace(/\D/g, "");
  }

  toString(): string {
    return this._raw;
  }
}
