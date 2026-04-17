import type { AggregateRoot } from "../../aggregate-root";
import type { UniqueEntityID } from "../../unique-entity-id";
import type { DomainEvent } from "./domain-event.interface";

type Handler = (event: DomainEvent) => void;

export class DomainEvents {
  private static handlersMap: Map<string, Handler[]> = new Map();
  private static markedAggregates: AggregateRoot<unknown>[] = [];

  static markAggregateForDispatch(aggregate: AggregateRoot<unknown>): void {
    const alreadyMarked = this.findMarkedAggregateById(aggregate.id);
    if (!alreadyMarked) {
      this.markedAggregates.push(aggregate);
    }
  }

  static dispatchEventsForAggregate(id: UniqueEntityID): void {
    const aggregate = this.findMarkedAggregateById(id);
    if (aggregate) {
      aggregate.domainEvents.forEach((event) => this.dispatch(event));
      aggregate.clearEvents();
      this.removeAggregateFromMarkedList(aggregate);
    }
  }

  static register(handler: Handler, eventClassName: string): void {
    const handlers = this.handlersMap.get(eventClassName) ?? [];
    handlers.push(handler);
    this.handlersMap.set(eventClassName, handlers);
  }

  static clearHandlers(): void {
    this.handlersMap = new Map();
  }

  static clearMarkedAggregates(): void {
    this.markedAggregates = [];
  }

  private static dispatch(event: DomainEvent): void {
    const handlers = this.handlersMap.get(event.constructor.name) ?? [];
    handlers.forEach((handler) => handler(event));
  }

  private static findMarkedAggregateById(
    id: UniqueEntityID
  ): AggregateRoot<unknown> | undefined {
    return this.markedAggregates.find((agg) => agg.id.equals(id));
  }

  private static removeAggregateFromMarkedList(
    aggregate: AggregateRoot<unknown>
  ): void {
    this.markedAggregates = this.markedAggregates.filter(
      (agg) => !agg.id.equals(aggregate.id)
    );
  }
}
