import { Injectable } from "@nestjs/common";
import { left, right, type Either } from "@/core/either";
import { PartnersRepository } from "../repositories/partners.repository";
import { isPartnerStatus, type Partner, type PartnerProps } from "../../enterprise/entities/partner";

export interface UpdatePartnerInput {
  id: string;
  requesterId: string;
  requesterRole: string;
  name?: string;
  partnerType?: string;
  partnerStatus?: string;
  partnershipStartedAt?: Date;
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
  starRating?: number | null;
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

    if (input.partnerStatus !== undefined && !isPartnerStatus(input.partnerStatus)) {
      return left(new Error("Status de parceria inválido"));
    }

    // starRating is 1–5 or null (clear). Guard the API path — the UI already constrains it.
    if (
      input.starRating !== undefined &&
      input.starRating !== null &&
      (!Number.isInteger(input.starRating) || input.starRating < 1 || input.starRating > 5)
    ) {
      return left(new Error("Classificação deve ser entre 1 e 5"));
    }

    const { id, requesterId, requesterRole, ...fields } = input;

    // Officializing (→ active) stamps the partnership start date once, unless one is
    // already set or explicitly provided in this update.
    if (
      input.partnerStatus === "active" &&
      input.partnershipStartedAt === undefined &&
      partner.partnershipStartedAt === undefined
    ) {
      fields.partnershipStartedAt = new Date();
    }

    partner.update(fields as Partial<Omit<PartnerProps, "ownerId" | "createdAt" | "updatedAt">>);

    await this.partners.save(partner);
    return right({ partner });
  }
}
