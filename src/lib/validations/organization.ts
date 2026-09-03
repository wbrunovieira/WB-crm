import { z } from "zod";

export const organizationSchema = z.object({
  name: z.string().min(2, "Nome Fantasia deve ter no mínimo 2 caracteres"),
  legalName: z.string().nullish(),
  foundationDate: z.string().nullish(),

  // Contact Info
  website: z.string().nullish(),
  phone: z.string().nullish(),
  whatsapp: z.string().nullish(),
  email: z.string().email("Email inválido").nullish().or(z.literal("")),

  // Location
  country: z.string().nullish(),
  state: z.string().nullish(),
  city: z.string().nullish(),
  zipCode: z.string().nullish(),
  streetAddress: z.string().nullish(),

  // Business Info
  industry: z.string().nullish(),
  employeeCount: z.number().int().positive().optional(),
  annualRevenue: z.number().positive().optional(),
  taxId: z.string().nullish(),
  description: z.string().nullish(),
  companyOwner: z.string().nullish(),
  companySize: z.string().nullish(),

  // Cadastrais/fiscais herdados do lead na conversão. As colunas e a entidade do backend já
  // existiam; faltava o frontend expor os campos.
  segment: z.string().nullish(),
  legalNature: z.string().nullish(),
  branchType: z.string().nullish(),
  simplesNacional: z.boolean().nullish(),
  isMei: z.boolean().nullish(),
  revenueRange: z.string().nullish(),
  phone2: z.string().nullish(),
  sourceGroup: z.string().nullish(),

  // CNAE
  primaryCNAEId: z.string().nullish(),
  internationalActivity: z.string().nullish(),

  // Idioma de comunicação (e-mail/newsletter)
  commLanguage: z.string().nullish(),

  // Social Media
  instagram: z.string().nullish(),
  linkedin: z.string().nullish(),
  facebook: z.string().nullish(),
  twitter: z.string().nullish(),
  tiktok: z.string().nullish(),

  // Idiomas (JSON)
  languages: z.array(z.object({ code: z.string(), isPrimary: z.boolean() })).optional().nullable(),

  // Labels (multiple)
  labelIds: z.array(z.string()).optional(),

  // Referral — parceiro que indicou esta organização
  referredByPartnerId: z.string().optional().nullable(),

  // Hosting
  hasHosting: z.boolean().nullish(),
  hostingRenewalDate: z.string().nullish(),
  hostingPlan: z.string().nullish(),
  hostingValue: z.number().nonnegative().nullish(),
  hostingReminderDays: z.number().int().positive().nullish(),
  hostingNotes: z.string().nullish(),
});

export type OrganizationFormData = z.infer<typeof organizationSchema>;
