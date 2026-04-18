import { AggregateRoot } from "@/core/aggregate-root";
import { UniqueEntityID } from "@/core/unique-entity-id";

export type SharedEntityType = "lead" | "contact" | "organization" | "partner" | "deal";

export const SHARED_ENTITY_TYPES: SharedEntityType[] = [
  "lead", "contact", "organization", "partner", "deal",
];

export interface SharedEntityProps {
  entityType: SharedEntityType;
  entityId: string;
  sharedWithUserId: string;
  sharedByUserId: string;
  createdAt: Date;
}

export class SharedEntity extends AggregateRoot<SharedEntityProps> {
  get entityType()       { return this.props.entityType; }
  get entityId()         { return this.props.entityId; }
  get sharedWithUserId() { return this.props.sharedWithUserId; }
  get sharedByUserId()   { return this.props.sharedByUserId; }
  get createdAt()        { return this.props.createdAt; }

  static create(props: SharedEntityProps, id?: UniqueEntityID): SharedEntity {
    return new SharedEntity(props, id);
  }
}
