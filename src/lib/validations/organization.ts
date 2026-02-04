import { z } from "zod";

export const organizationSchema = z.object({
  name: z.string().min(2, "Nome Fantasia deve ter no mínimo 2 caracteres"),
  legalName: z.string().optional(),
  foundationDate: z.string().optional(),

  // Contact Info
  website: z.string().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),

  // Location
  country: z.string().optional(),
  state: z.string().optional(),
  city: z.string().optional(),
  zipCode: z.string().optional(),
  streetAddress: z.string().optional(),

  // Business Info
  industry: z.string().optional(),
  employeeCount: z.number().int().positive().optional(),
  annualRevenue: z.number().positive().optional(),
  taxId: z.string().optional(),
  description: z.string().optional(),
  companyOwner: z.string().optional(),
  companySize: z.string().optional(),

  // CNAE
  primaryCNAEId: z.string().optional(),
  internationalActivity: z.string().optional(),

  // Social Media
  instagram: z.string().optional(),
  linkedin: z.string().optional(),
  facebook: z.string().optional(),
  twitter: z.string().optional(),
  tiktok: z.string().optional(),

  // Label
  labelId: z.string().optional(),

  // Hosting
  hasHosting: z.boolean().nullish(),
  hostingRenewalDate: z.string().nullish(),
  hostingPlan: z.string().nullish(),
  hostingValue: z.number().nonnegative().nullish(),
  hostingReminderDays: z.number().int().positive().nullish(),
  hostingNotes: z.string().nullish(),
});

export type OrganizationFormData = z.infer<typeof organizationSchema>;
