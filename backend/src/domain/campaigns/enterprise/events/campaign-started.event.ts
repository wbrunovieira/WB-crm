import type { DomainEvent } from "@/core/domain/events/domain-event.interface";
import type { UniqueEntityID } from "@/core/unique-entity-id";

export class CampaignStartedEvent implements DomainEvent {
  ocurredAt = new Date();

  constructor(public readonly campaignId: UniqueEntityID) {}

  getAggregateId(): UniqueEntityID {
    return this.campaignId;
  }
}
