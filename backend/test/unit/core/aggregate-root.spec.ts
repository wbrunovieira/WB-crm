import { describe, it, expect, beforeEach } from "vitest";
import { AggregateRoot } from "@/core/aggregate-root";
import { UniqueEntityID } from "@/core/unique-entity-id";
import { DomainEvents } from "@/core/domain/events/domain-events";
import type { DomainEvent } from "@/core/domain/events/domain-event.interface";

interface OrderProps {
  total: number;
}

class OrderCreatedEvent implements DomainEvent {
  ocurredAt = new Date();
  constructor(public readonly orderId: UniqueEntityID) {}
  getAggregateId() {
    return this.orderId;
  }
}

class FakeOrder extends AggregateRoot<OrderProps> {
  get total() {
    return this.props.total;
  }

  static create(props: OrderProps, id?: UniqueEntityID) {
    const order = new FakeOrder(props, id);
    order.addDomainEvent(new OrderCreatedEvent(order.id));
    return order;
  }
}

describe("AggregateRoot", () => {
  beforeEach(() => {
    DomainEvents.clearHandlers();
    DomainEvents.clearMarkedAggregates();
  });

  it("adiciona eventos de domínio ao criar aggregate", () => {
    const order = FakeOrder.create({ total: 100 });
    expect(order.domainEvents).toHaveLength(1);
    expect(order.domainEvents[0]).toBeInstanceOf(OrderCreatedEvent);
  });

  it("clearEvents remove todos os eventos", () => {
    const order = FakeOrder.create({ total: 100 });
    order.clearEvents();
    expect(order.domainEvents).toHaveLength(0);
  });

  it("despacha evento ao chamar dispatchEventsForAggregate", () => {
    const dispatched: DomainEvent[] = [];
    DomainEvents.register((e) => dispatched.push(e), "OrderCreatedEvent");

    const order = FakeOrder.create({ total: 200 });
    DomainEvents.dispatchEventsForAggregate(order.id);

    expect(dispatched).toHaveLength(1);
    expect(order.domainEvents).toHaveLength(0); // limpos após dispatch
  });

  it("não despacha duas vezes para o mesmo aggregate", () => {
    const dispatched: DomainEvent[] = [];
    DomainEvents.register((e) => dispatched.push(e), "OrderCreatedEvent");

    const order = FakeOrder.create({ total: 50 });
    DomainEvents.dispatchEventsForAggregate(order.id);
    DomainEvents.dispatchEventsForAggregate(order.id); // segunda chamada: sem efeito

    expect(dispatched).toHaveLength(1);
  });
});
