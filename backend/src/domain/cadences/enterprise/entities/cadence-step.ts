import { Entity } from "@/core/entity";
import { UniqueEntityID } from "@/core/unique-entity-id";
import { Either, left, right } from "@/core/either";
import { StepChannel } from "../value-objects/step-channel.vo";
import { StepDayNumber } from "../value-objects/step-day-number.vo";

export interface CadenceStepProps {
  cadenceId: string;
  dayNumber: StepDayNumber;
  channel: StepChannel;
  subject: string;
  description?: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export class CadenceStepSubjectError extends Error { name = "CadenceStepSubjectError"; }

export class CadenceStep extends Entity<CadenceStepProps> {
  get cadenceId(): string { return this.props.cadenceId; }
  get dayNumber(): number { return this.props.dayNumber.value; }
  get channel(): string { return this.props.channel.value; }
  get activityType(): string { return this.props.channel.toActivityType(); }
  get subject(): string { return this.props.subject; }
  get description(): string | undefined { return this.props.description; }
  get order(): number { return this.props.order; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  static create(data: {
    cadenceId: string;
    dayNumber: number;
    channel: string;
    subject: string;
    description?: string;
    order?: number;
    createdAt?: Date;
    updatedAt?: Date;
  }, id?: UniqueEntityID): Either<Error, CadenceStep> {
    const dayResult = StepDayNumber.create(data.dayNumber);
    if (dayResult.isLeft()) return left(dayResult.value);

    const channelResult = StepChannel.create(data.channel);
    if (channelResult.isLeft()) return left(channelResult.value);

    const subject = data.subject.trim();
    if (!subject) return left(new CadenceStepSubjectError("Assunto do step não pode ser vazio"));
    if (subject.length > 200) return left(new CadenceStepSubjectError("Assunto do step não pode ter mais de 200 caracteres"));

    const now = new Date();
    return right(new CadenceStep({
      cadenceId: data.cadenceId,
      dayNumber: dayResult.value as StepDayNumber,
      channel: channelResult.value as StepChannel,
      subject,
      description: data.description,
      order: data.order ?? 0,
      createdAt: data.createdAt ?? now,
      updatedAt: data.updatedAt ?? now,
    }, id));
  }

  update(data: { dayNumber?: number; channel?: string; subject?: string; description?: string; order?: number }): Either<Error, void> {
    if (data.dayNumber !== undefined) {
      const r = StepDayNumber.create(data.dayNumber);
      if (r.isLeft()) return left(r.value);
      this.props.dayNumber = r.value as StepDayNumber;
    }
    if (data.channel !== undefined) {
      const r = StepChannel.create(data.channel);
      if (r.isLeft()) return left(r.value);
      this.props.channel = r.value as StepChannel;
    }
    if (data.subject !== undefined) {
      const subject = data.subject.trim();
      if (!subject) return left(new CadenceStepSubjectError("Assunto não pode ser vazio"));
      this.props.subject = subject;
    }
    if (data.description !== undefined) this.props.description = data.description;
    if (data.order !== undefined) this.props.order = data.order;
    this.props.updatedAt = new Date();
    return right(undefined);
  }
}
