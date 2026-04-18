import { Injectable } from "@nestjs/common";
import { left, right, type Either } from "@/core/either";
import { PartnersRepository } from "../repositories/partners.repository";
import type { PartnerDetail } from "../../enterprise/read-models/partner-read-models";

interface Input {
  id: string;
  requesterId: string;
  requesterRole: string;
}

type Output = Either<Error, { partner: PartnerDetail }>;

@Injectable()
export class GetPartnerByIdUseCase {
  constructor(private readonly partners: PartnersRepository) {}

  async execute({ id, requesterId, requesterRole }: Input): Promise<Output> {
    const partner = await this.partners.findById(id, requesterId, requesterRole);
    if (!partner) return left(new Error("Parceiro não encontrado"));
    return right({ partner });
  }
}
