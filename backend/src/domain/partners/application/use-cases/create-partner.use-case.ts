import { Injectable } from "@nestjs/common";
import { left, right, type Either } from "@/core/either";
import { PartnersRepository } from "../repositories/partners.repository";
import { Partner } from "../../enterprise/entities/partner";

export interface CreatePartnerInput {
  ownerId: string;
  name: string;
  partnerType: string;
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
export class CreatePartnerUseCase {
  constructor(private readonly partners: PartnersRepository) {}

  async execute(input: CreatePartnerInput): Promise<Output> {
    if (!input.name?.trim()) return left(new Error("Nome do parceiro é obrigatório"));
    if (!input.partnerType?.trim()) return left(new Error("Tipo de parceria é obrigatório"));

    const partner = Partner.create({
      ownerId: input.ownerId,
      name: input.name.trim(),
      partnerType: input.partnerType,
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
      lastContactDate: new Date(),
    });

    await this.partners.save(partner);
    return right({ partner });
  }
}
