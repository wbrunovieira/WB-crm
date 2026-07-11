import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { PartnersRepository } from "../repositories/partners.repository";

/**
 * Reusable guard that asserts a partner reference is accessible by the requester.
 *
 * A foreign key only guarantees the partner *exists* — not that it belongs to the
 * requester. Without this check a user could link (and thus read back the name of)
 * another owner's partner. Admins bypass the ownership check, mirroring the
 * "admin sees all" rule used across the CRM.
 */
@Injectable()
export class PartnerOwnershipValidator {
  constructor(private readonly partners: PartnersRepository) {}

  /**
   * No-op when partnerId is null/undefined/empty. Otherwise the partner must
   * exist and be owned by the requester (or the requester must be an admin).
   */
  async assertAccessible(
    partnerId: string | null | undefined,
    requesterId: string,
    requesterRole: string,
  ): Promise<Either<Error, void>> {
    if (!partnerId) return right(undefined);

    const partner = await this.partners.findByIdRaw(partnerId);
    if (!partner) return left(new Error("Parceiro não encontrado"));

    if (requesterRole !== "admin" && partner.ownerId !== requesterId) {
      return left(new Error("Não autorizado"));
    }

    return right(undefined);
  }
}
