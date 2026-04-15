import { z } from 'zod';

export const sectorSchema = z.object({
  name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres').max(100),
  slug: z
    .string()
    .min(2, 'Slug deve ter ao menos 2 caracteres')
    .max(80)
    .regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hífens'),
  description: z.string().max(2000).nullable().optional(),
  isActive: z.boolean().default(true),
  // Market
  marketSize: z.string().max(500).nullable().optional(),
  marketSizeNotes: z.string().max(2000).nullable().optional(),
  averageTicket: z.string().max(200).nullable().optional(),
  budgetSeason: z.string().max(200).nullable().optional(),
  // Sales cycle
  salesCycleDays: z.number().int().min(1).max(3650).nullable().optional(),
  salesCycleNotes: z.string().max(1000).nullable().optional(),
  // Buyer profile
  decisionMakers: z.string().max(1000).nullable().optional(),
  buyingProcess: z.string().max(2000).nullable().optional(),
  mainObjections: z.string().max(2000).nullable().optional(),
  // Market knowledge
  mainPains: z.string().max(2000).nullable().optional(),
  referenceCompanies: z.string().max(1000).nullable().optional(),
  competitorsLandscape: z.string().max(1000).nullable().optional(),
  jargons: z.string().max(2000).nullable().optional(),
  regulatoryNotes: z.string().max(2000).nullable().optional(),
});

export const sectorUpdateSchema = sectorSchema.partial();

export type SectorFormData = z.infer<typeof sectorSchema>;
export type SectorUpdateData = z.infer<typeof sectorUpdateSchema>;
