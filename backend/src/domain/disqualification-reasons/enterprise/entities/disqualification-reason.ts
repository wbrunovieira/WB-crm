import { Entity } from "@/core/entity";
import { UniqueEntityID } from "@/core/unique-entity-id";
import { Either, left, right } from "@/core/either";
import { ReasonName } from "../value-objects/reason-name.vo";

export interface DisqualificationReasonProps {
  name: ReasonName;
  ownerId: string;
  createdAt: Date;
}

export class DisqualificationReason extends Entity<DisqualificationReasonProps> {
  get name(): string { return this.props.name.value; }
  get ownerId(): string { return this.props.ownerId; }
  get createdAt(): Date { return this.props.createdAt; }

  static create(data: { name: string; ownerId: string; createdAt?: Date }, id?: UniqueEntityID): Either<Error, DisqualificationReason> {
    const nameResult = ReasonName.create(data.name);
    if (nameResult.isLeft()) return left(nameResult.value);

    return right(new DisqualificationReason({
      name: nameResult.value as ReasonName,
      ownerId: data.ownerId,
      createdAt: data.createdAt ?? new Date(),
    }, id));
  }
}
