import { AggregateRoot } from "@/core/aggregate-root";
import { UniqueEntityID } from "@/core/unique-entity-id";
import { Either, left, right } from "@/core/either";
import { LabelName, InvalidLabelNameError } from "../value-objects/label-name.vo";
import { HexColor, InvalidHexColorError } from "../value-objects/hex-color.vo";

interface LabelProps {
  name: LabelName;
  color: HexColor;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

interface CreateLabelProps {
  name: LabelName;
  color: HexColor;
  ownerId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Label extends AggregateRoot<LabelProps> {
  get name(): string { return this.props.name.toString(); }
  get color(): string { return this.props.color.toString(); }
  get ownerId(): string { return this.props.ownerId; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  update(data: { name?: string; color?: string }): Either<InvalidLabelNameError | InvalidHexColorError, void> {
    if (data.name !== undefined) {
      const result = LabelName.create(data.name);
      if (result.isLeft()) return left(result.value);
      this.props.name = result.value;
    }
    if (data.color !== undefined) {
      const result = HexColor.create(data.color);
      if (result.isLeft()) return left(result.value);
      this.props.color = result.value;
    }
    this.props.updatedAt = new Date();
    return right(undefined);
  }

  static create(props: CreateLabelProps, id?: UniqueEntityID): Label {
    const now = new Date();
    return new Label(
      {
        ...props,
        createdAt: props.createdAt ?? now,
        updatedAt: props.updatedAt ?? now,
      },
      id,
    );
  }
}
