import { Injectable } from "@nestjs/common";
import { left, right, type Either } from "@/core/either";
import { PartnersRepository } from "../repositories/partners.repository";
import type { Partner, PartnerProps } from "../../enterprise/entities/partner";

export interface UpdatePartnerInput {
  id: string;
  requesterId: string;
  requesterRole: string;
  name?: string;
  partnerType?: string;
  legalName?: string;
  foundationDate?: Date;
  website?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  country?: string;
  state?: string;
  city?: string;
  zipCode?: string;
  streetAddress?: string;
  linkedin?: string;
  instagram?: string;
  facebook?: string;
  twitter?: string;
  industry?: string;
  employeeCount?: number;
  companySize?: string;
  description?: string;
  expertise?: string;
  notes?: string;
}

type Output = Either<Error, { partner: Partner }>;

@Injectable()
export class UpdatePartnerUseCase {
  constructor(private readonly partners: PartnersRepository) {}

  async execute(input: UpdatePartnerInput): Promise<Output> {
    const partner = await this.partners.findByIdRaw(input.id);
    if (!partner) return left(new Error("Parceiro não encontrado"));

    if (input.requesterRole !== "admin" && partner.ownerId !== input.requesterId) {
      return left(new Error("Não autorizado"));
    }

    const { id, requesterId, requesterRole, ...fields } = input;
    partner.update(fields as Partial<Omit<PartnerProps, "ownerId" | "createdAt" | "updatedAt">>);

    await this.partners.save(partner);
    return right({ partner });
  }
}
