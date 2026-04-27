import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { WhatsAppEntityRepository } from "../repositories/whatsapp-entity.repository";
import { EntityNotFoundError } from "./save-whatsapp-verification.use-case";

export interface SaveWhatsAppNumberInput {
  entityType: "lead" | "contact" | "lead_contact";
  entityId: string;
  ownerId: string;
  whatsapp: string;
}

@Injectable()
export class SaveWhatsAppNumberUseCase {
  constructor(private readonly repo: WhatsAppEntityRepository) {}

  async execute(input: SaveWhatsAppNumberInput): Promise<Either<EntityNotFoundError, void>> {
    let found: boolean;
    if (input.entityType === "lead") {
      found = await this.repo.updateLeadNumber(input.entityId, input.ownerId, input.whatsapp);
    } else if (input.entityType === "contact") {
      found = await this.repo.updateContactNumber(input.entityId, input.ownerId, input.whatsapp);
    } else {
      found = await this.repo.updateLeadContactNumber(input.entityId, input.whatsapp);
    }

    if (!found) return left(new EntityNotFoundError());
    return right(undefined);
  }
}
