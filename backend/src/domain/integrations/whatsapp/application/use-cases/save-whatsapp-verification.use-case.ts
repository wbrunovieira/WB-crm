import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { WhatsAppEntityRepository } from "../repositories/whatsapp-entity.repository";

export class EntityNotFoundError extends Error {
  constructor() { super("Entidade não encontrada"); this.name = "EntityNotFoundError"; }
}

export interface SaveWhatsAppVerificationInput {
  entityType: "lead" | "contact" | "lead_contact";
  entityId: string;
  ownerId: string;
  verifiedNumber: string;
  exists?: boolean;
}

@Injectable()
export class SaveWhatsAppVerificationUseCase {
  constructor(private readonly repo: WhatsAppEntityRepository) {}

  async execute(input: SaveWhatsAppVerificationInput): Promise<Either<EntityNotFoundError, void>> {
    const data = {
      whatsappVerified: input.exists ?? true,
      whatsappVerifiedAt: new Date(),
      whatsappVerifiedNumber: input.verifiedNumber,
    };

    let found: boolean;
    if (input.entityType === "lead") {
      found = await this.repo.updateLeadVerification(input.entityId, input.ownerId, data);
    } else if (input.entityType === "contact") {
      found = await this.repo.updateContactVerification(input.entityId, input.ownerId, data);
    } else {
      found = await this.repo.updateLeadContactVerification(input.entityId, data);
    }

    if (!found) return left(new EntityNotFoundError());
    return right(undefined);
  }
}
