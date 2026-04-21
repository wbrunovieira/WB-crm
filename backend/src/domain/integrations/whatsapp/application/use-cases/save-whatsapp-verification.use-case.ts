import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { WhatsAppEntityRepository } from "../repositories/whatsapp-entity.repository";

export class EntityNotFoundError extends Error {
  constructor() { super("Entidade não encontrada"); this.name = "EntityNotFoundError"; }
}

export interface SaveWhatsAppVerificationInput {
  entityType: "lead" | "contact";
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

    const found = input.entityType === "lead"
      ? await this.repo.updateLeadVerification(input.entityId, input.ownerId, data)
      : await this.repo.updateContactVerification(input.entityId, input.ownerId, data);

    if (!found) return left(new EntityNotFoundError());
    return right(undefined);
  }
}
