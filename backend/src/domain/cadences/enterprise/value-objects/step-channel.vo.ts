import { Either, left, right } from "@/core/either";

export type StepChannelValue = "email" | "linkedin" | "whatsapp" | "call" | "meeting" | "instagram" | "task";

export class StepChannel {
  private constructor(private readonly _value: StepChannelValue) {}
  get value(): StepChannelValue { return this._value; }
  toString(): string { return this._value; }

  static create(raw: string): Either<Error, StepChannel> {
    const valid: StepChannelValue[] = ["email", "linkedin", "whatsapp", "call", "meeting", "instagram", "task"];
    if (!valid.includes(raw as StepChannelValue)) {
      return left(new Error(`Canal de step inválido: ${raw}. Use: ${valid.join(", ")}`));
    }
    return right(new StepChannel(raw as StepChannelValue));
  }

  // Maps cadence channel to Activity type
  toActivityType(): string {
    const map: Record<StepChannelValue, string> = {
      email: "email", linkedin: "task", whatsapp: "whatsapp",
      call: "call", meeting: "meeting", instagram: "instagram_dm", task: "task",
    };
    return map[this._value];
  }
}
