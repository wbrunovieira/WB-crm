import { Injectable } from "@nestjs/common";
import { left, right, type Either } from "@/core/either";
import { PartnersRepository } from "../repositories/partners.repository";
import type { Partner } from "../../enterprise/entities/partner";

interface Input {
  id: string;
  requesterId: string;
  requesterRole: string;
}

type Output = Either<Error, { partner: Partner }>;

@Injectable()
export class UpdatePartnerLastContactUseCase {
  constructor(private readonly partners: PartnersRepository) {}

  async execute({ id, requesterId, requesterRole }: Input): Promise<Output> {
    const partner = await this.partners.findByIdRaw(id);
    if (!partner) return left(new Error("Parceiro não encontrado"));

    if (requesterRole !== "admin" && partner.ownerId !== requesterId) {
      return left(new Error("Não autorizado"));
    }

    partner.touchLastContact();
    await this.partners.save(partner);
    return right({ partner });
  }
}
