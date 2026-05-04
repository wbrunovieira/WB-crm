import { Either, right } from "@/core/either";

export type CallOutcomeValue =
  | "answered"
  | "voicemail"
  | "no_answer"
  | "busy"
  | "rejected"
  | "invalid_number"
  | "missed"
  | "unknown";

const VOICEMAIL_THRESHOLD_S = 25; // BR carrier voicemail greetings typically 15-25s

export class CallOutcome {
  private constructor(private readonly _value: CallOutcomeValue) {}

  static fromCallHistory(
    hangupCause: number | undefined,
    direction: "INBOUND" | "OUTBOUND",
    durationMs: number,
    answerTime: string | undefined,
  ): Either<never, CallOutcome> {
    const durationSeconds = Math.round(durationMs / 1000);
    const isAnswered = answerTime !== undefined;
    let value: CallOutcomeValue;

    if (direction === "INBOUND") {
      value = isAnswered ? "answered" : "missed";
    } else if (!isAnswered) {
      switch (hangupCause) {
        case 17: value = "busy"; break;
        case 18: case 19: value = "no_answer"; break;
        case 21: value = "rejected"; break;
        case 1: case 28: value = "invalid_number"; break;
        default: value = "unknown";
      }
    } else {
      value = durationSeconds < VOICEMAIL_THRESHOLD_S ? "voicemail" : "answered";
    }

    return right(new CallOutcome(value));
  }

  static fromCauseCode(
    causeCode: number | undefined,
    direction: "INBOUND" | "OUTBOUND",
    durationSeconds: number,
  ): Either<never, CallOutcome> {
    let value: CallOutcomeValue;

    if (direction === "INBOUND") {
      value = durationSeconds === 0 ? "missed" : "answered";
    } else {
      switch (causeCode) {
        case 16:
          value = durationSeconds < VOICEMAIL_THRESHOLD_S ? "voicemail" : "answered";
          break;
        case 17:
          value = "busy";
          break;
        case 18:
        case 19:
          value = "no_answer";
          break;
        case 21:
          value = "rejected";
          break;
        case 1:
        case 28:
          value = "invalid_number";
          break;
        default:
          value = durationSeconds > 0 ? "answered" : "unknown";
      }
    }

    return right(new CallOutcome(value));
  }

  toString(): CallOutcomeValue {
    return this._value;
  }

  get isAnswered(): boolean {
    return this._value === "answered";
  }
}
