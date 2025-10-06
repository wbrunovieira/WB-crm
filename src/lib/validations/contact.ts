import { z } from "zod";

export const contactSchema = z.object({
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  role: z.string().optional(),
  department: z.string().optional(),
  // Company linking - companyId + companyType will be split into leadId/organizationId/partnerId
  companyId: z.string().optional().nullable(),
  companyType: z.enum(["lead", "organization", "partner"]).optional().nullable(),
  linkedin: z.string().url("URL do LinkedIn inválida").optional().or(z.literal("")),
  status: z.enum(["active", "inactive", "bounced"]).optional(),
  isPrimary: z.boolean().optional(),
  birthDate: z.string().optional(), // Will be converted to Date in the action
  notes: z.string().optional(),
  preferredLanguage: z.string().optional(),
  source: z.string().optional(),
  sourceLeadContactId: z.string().optional().nullable(),
});

export type ContactFormData = z.infer<typeof contactSchema>;
