import { z } from "zod";

export const organizationSchema = z.object({
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),

  // Contact Info
  website: z.string().optional(),
  phone: z.string().optional(),

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

  // Social Media
  instagram: z.string().optional(),
  linkedin: z.string().optional(),
  facebook: z.string().optional(),
  twitter: z.string().optional(),
});

export type OrganizationFormData = z.infer<typeof organizationSchema>;
