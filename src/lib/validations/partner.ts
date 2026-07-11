import { z } from "zod";

/**
 * Partner lifecycle stages (orthogonal to partnerType).
 * Keep in sync with the backend list in
 * backend/src/domain/partners/enterprise/entities/partner.ts (PARTNER_STATUSES).
 */
export const PARTNER_STATUSES = ["prospect", "active", "inactive"] as const;
export type PartnerStatus = (typeof PARTNER_STATUSES)[number];

export const PARTNER_STATUS_LABELS: Record<PartnerStatus, string> = {
  prospect: "Lead de parceiro",
  active: "Parceria ativa",
  inactive: "Inativa",
};

export const partnerSchema = z.object({
  name: z.string().min(2, "Nome da empresa deve ter no mínimo 2 caracteres"),
  legalName: z.string().optional(),
  foundationDate: z.string().optional(),
  partnerType: z.string().min(1, "Tipo de parceria é obrigatório"),
  partnerStatus: z.enum(PARTNER_STATUSES).optional(),
  website: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  country: z.string().optional(),
  state: z.string().optional(),
  city: z.string().optional(),
  zipCode: z.string().optional(),
  streetAddress: z.string().optional(),
  linkedin: z.string().optional(),
  instagram: z.string().optional(),
  facebook: z.string().optional(),
  twitter: z.string().optional(),
  industry: z.string().optional(),
  employeeCount: z.number().optional(),
  description: z.string().optional(),
  expertise: z.string().optional(),
  notes: z.string().optional(),
});

export type PartnerFormData = z.infer<typeof partnerSchema>;
