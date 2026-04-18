import { Injectable } from "@nestjs/common";
import { left, right, type Either } from "@/core/either";
import { DealsRepository } from "../repositories/deals.repository";
import type { Deal } from "../../enterprise/entities/deal";

export interface UpdateDealInput {
  id: string;
  requesterId: string;
  requesterRole: string;
  title?: string;
  description?: string;
  value?: number;
  currency?: string;
  status?: "open" | "won" | "lost";
  closedAt?: Date;
  contactId?: string;
  organizationId?: string;
  expectedCloseDate?: Date;
}

type Output = Either<Error, { deal: Deal }>;

@Injectable()
export class UpdateDealUseCase {
  constructor(private readonly deals: DealsRepository) {}

  async execute(input: UpdateDealInput): Promise<Output> {
    const deal = await this.deals.findByIdRaw(input.id);
    if (!deal) return left(new Error("Deal não encontrado"));

    const isOwner = deal.ownerId === input.requesterId;
    const isAdmin = input.requesterRole === "admin";
    if (!isOwner && !isAdmin) return left(new Error("Não autorizado"));

    const updates: Partial<typeof deal["props"]> = {};
    if (input.title !== undefined)             updates.title = input.title.trim();
    if (input.description !== undefined)       updates.description = input.description;
    if (input.value !== undefined)             updates.value = input.value;
    if (input.currency !== undefined)          updates.currency = input.currency;
    if (input.contactId !== undefined)         updates.contactId = input.contactId;
    if (input.organizationId !== undefined)    updates.organizationId = input.organizationId;
    if (input.expectedCloseDate !== undefined) updates.expectedCloseDate = input.expectedCloseDate;

    if (input.status !== undefined) {
      updates.status = input.status;
      if (input.status === "open") {
        updates.closedAt = undefined;
      } else {
        updates.closedAt = input.closedAt ?? new Date();
      }
    }

    deal.update(updates);
    await this.deals.save(deal);
    return right({ deal });
  }
}
