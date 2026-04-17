import { UniqueEntityID } from "./unique-entity-id";

export abstract class Entity<Props> {
  private readonly _id: UniqueEntityID;
  protected props: Props;

  get id(): UniqueEntityID {
    return this._id;
  }

  constructor(props: Props, id?: UniqueEntityID) {
    this._id = id ?? new UniqueEntityID();
    this.props = props;
  }

  equals(entity: Entity<unknown>): boolean {
    if (entity === this) return true;
    return this._id.equals(entity._id);
  }
}
