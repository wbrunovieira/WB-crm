import type { UniqueEntityID } from "../../unique-entity-id";

export interface DomainEvent {
  ocurredAt: Date;
  getAggregateId(): UniqueEntityID;
}
