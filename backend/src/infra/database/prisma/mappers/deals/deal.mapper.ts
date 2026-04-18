import type { Deal as PrismaDeal } from "@prisma/client";
import { Deal } from "@/domain/deals/enterprise/entities/deal";
import { UniqueEntityID } from "@/core/unique-entity-id";

export class DealMapper {
  static toDomain(raw: PrismaDeal): Deal {
    return Deal.create(
      {
        ownerId: raw.ownerId,
        title: raw.title,
        description: raw.description ?? undefined,
        value: raw.value,
        currency: raw.currency,
        status: raw.status as "open" | "won" | "lost",
        closedAt: raw.closedAt ?? undefined,
        stageId: raw.stageId,
        contactId: raw.contactId ?? undefined,
        organizationId: raw.organizationId ?? undefined,
        leadId: raw.leadId ?? undefined,
        expectedCloseDate: raw.expectedCloseDate ?? undefined,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
      },
      new UniqueEntityID(raw.id),
    );
  }

  static toPrisma(deal: Deal): Omit<PrismaDeal, never> {
    return {
      id: deal.id.toString(),
      ownerId: deal.ownerId,
      title: deal.title,
      description: deal.description ?? null,
      value: deal.value,
      currency: deal.currency,
      status: deal.status,
      closedAt: deal.closedAt ?? null,
      stageId: deal.stageId,
      contactId: deal.contactId ?? null,
      organizationId: deal.organizationId ?? null,
      leadId: deal.leadId ?? null,
      expectedCloseDate: deal.expectedCloseDate ?? null,
      createdAt: deal.createdAt,
      updatedAt: deal.updatedAt,
    } as PrismaDeal;
  }
}
