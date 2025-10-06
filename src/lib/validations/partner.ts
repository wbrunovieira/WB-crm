import { z } from "zod";

export const partnerSchema = z.object({
  name: z.string().min(2, "Nome da empresa deve ter no mínimo 2 caracteres"),
  legalName: z.string().optional(),
  foundationDate: z.string().optional(),
  partnerType: z.string().min(1, "Tipo de parceria é obrigatório"),
  website: z.string().url("URL inválida").optional().or(z.literal("")),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  country: z.string().optional(),
  state: z.string().optional(),
  city: z.string().optional(),
  zipCode: z.string().optional(),
  streetAddress: z.string().optional(),
  linkedin: z.string().url("URL do LinkedIn inválida").optional().or(z.literal("")),
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
