import { Injectable } from "@nestjs/common";
import { right, type Either } from "@/core/either";
import { PartnersRepository, type PartnerFilters } from "../repositories/partners.repository";
import type { PartnerSummary } from "../../enterprise/read-models/partner-read-models";

interface Input {
  requesterId: string;
  requesterRole: string;
  filters?: PartnerFilters;
}

type Output = Either<never, { partners: PartnerSummary[] }>;

@Injectable()
export class GetPartnersUseCase {
  constructor(private readonly partners: PartnersRepository) {}

  async execute({ requesterId, requesterRole, filters = {} }: Input): Promise<Output> {
    const partners = await this.partners.findMany(requesterId, requesterRole, filters);
    return right({ partners });
  }
}
