import { Entity } from "./entity";
import type { UniqueEntityID } from "./unique-entity-id";
import { DomainEvents } from "./domain/events/domain-events";
import type { DomainEvent } from "./domain/events/domain-event.interface";

export abstract class AggregateRoot<Props> extends Entity<Props> {
  private _domainEvents: DomainEvent[] = [];

  get domainEvents(): DomainEvent[] {
    return this._domainEvents;
  }

  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
    DomainEvents.markAggregateForDispatch(this as AggregateRoot<unknown>);
  }

  clearEvents(): void {
    this._domainEvents = [];
  }

}
