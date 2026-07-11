import { Injectable } from "@nestjs/common";
import { left, right, type Either } from "@/core/either";
import { PartnersRepository } from "../repositories/partners.repository";
import { Partner, isPartnerStatus } from "../../enterprise/entities/partner";
import { PartnerName } from "../../enterprise/value-objects/partner-name.vo";

export interface CreatePartnerInput {
  ownerId: string;
  name: string;
  partnerType: string;
  partnerStatus?: string;
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
  languages?: string | null;
  primaryCNAEId?: string | null;
  internationalActivity?: string | null;
}

type Output = Either<Error, { partner: Partner }>;

@Injectable()
export class CreatePartnerUseCase {
  constructor(private readonly partners: PartnersRepository) {}

  async execute(input: CreatePartnerInput): Promise<Output> {
    const nameResult = PartnerName.create(input.name);
    if (nameResult.isLeft()) return left(nameResult.value);
    if (!input.partnerType?.trim()) return left(new Error("Tipo de parceria é obrigatório"));

    const partnerStatus = input.partnerStatus ?? "prospect";
    if (!isPartnerStatus(partnerStatus)) return left(new Error("Status de parceria inválido"));

    const partner = Partner.create({
      ownerId: input.ownerId,
      name: nameResult.value.value,
      partnerType: input.partnerType,
      partnerStatus,
      // Officializing on creation stamps the partnership start date.
      partnershipStartedAt: partnerStatus === "active" ? new Date() : undefined,
      legalName: input.legalName,
      foundationDate: input.foundationDate,
      website: input.website,
      email: input.email,
      phone: input.phone,
      whatsapp: input.whatsapp,
      country: input.country,
      state: input.state,
      city: input.city,
      zipCode: input.zipCode,
      streetAddress: input.streetAddress,
      linkedin: input.linkedin,
      instagram: input.instagram,
      facebook: input.facebook,
      twitter: input.twitter,
      industry: input.industry,
      employeeCount: input.employeeCount,
      companySize: input.companySize,
      description: input.description,
      expertise: input.expertise,
      notes: input.notes,
      languages: input.languages,
      primaryCNAEId: input.primaryCNAEId,
      internationalActivity: input.internationalActivity,
      lastContactDate: new Date(),
    });

    await this.partners.save(partner);
    return right({ partner });
  }
}
