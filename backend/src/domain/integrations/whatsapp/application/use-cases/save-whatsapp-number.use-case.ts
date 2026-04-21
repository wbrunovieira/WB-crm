import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { WhatsAppEntityRepository } from "../repositories/whatsapp-entity.repository";
import { EntityNotFoundError } from "./save-whatsapp-verification.use-case";

export interface SaveWhatsAppNumberInput {
  entityType: "lead" | "contact";
  entityId: string;
  ownerId: string;
  whatsapp: string;
}

@Injectable()
export class SaveWhatsAppNumberUseCase {
  constructor(private readonly repo: WhatsAppEntityRepository) {}

  async execute(input: SaveWhatsAppNumberInput): Promise<Either<EntityNotFoundError, void>> {
    const found = input.entityType === "lead"
      ? await this.repo.updateLeadNumber(input.entityId, input.ownerId, input.whatsapp)
      : await this.repo.updateContactNumber(input.entityId, input.ownerId, input.whatsapp);

    if (!found) return left(new EntityNotFoundError());
    return right(undefined);
  }
}
