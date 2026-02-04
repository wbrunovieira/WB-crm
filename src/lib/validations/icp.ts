import { z } from "zod";

// Slug regex: only lowercase letters, numbers, and hyphens
const slugRegex = /^[a-z0-9-]+$/;

// ICP status enum
const icpStatusEnum = z.enum(["draft", "active", "archived"]);

// Schema for creating an ICP
export const icpSchema = z.object({
  name: z
    .string()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(100, "Nome deve ter no máximo 100 caracteres"),
  slug: z
    .string()
    .min(2, "Slug deve ter pelo menos 2 caracteres")
    .max(50, "Slug deve ter no máximo 50 caracteres")
    .regex(slugRegex, "Slug deve conter apenas letras minúsculas, números e hífens"),
  content: z
    .string()
    .min(1, "Conteúdo é obrigatório")
    .max(10000, "Conteúdo deve ter no máximo 10000 caracteres"),
  status: icpStatusEnum.default("draft"),
});

// Schema for updating an ICP (all fields optional + changeReason)
export const icpUpdateSchema = z.object({
  name: z
    .string()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(100, "Nome deve ter no máximo 100 caracteres")
    .optional(),
  slug: z
    .string()
    .min(2, "Slug deve ter pelo menos 2 caracteres")
    .max(50, "Slug deve ter no máximo 50 caracteres")
    .regex(slugRegex, "Slug deve conter apenas letras minúsculas, números e hífens")
    .optional(),
  content: z
    .string()
    .min(1, "Conteúdo é obrigatório")
    .max(10000, "Conteúdo deve ter no máximo 10000 caracteres")
    .optional(),
  status: icpStatusEnum.optional(),
  changeReason: z
    .string()
    .max(500, "Motivo da alteração deve ter no máximo 500 caracteres")
    .optional(),
});

// Schema for linking Lead to ICP
export const leadICPSchema = z.object({
  leadId: z.string().min(1, "Lead é obrigatório"),
  icpId: z.string().min(1, "ICP é obrigatório"),
  matchScore: z
    .number()
    .int()
    .min(0, "Score deve ser no mínimo 0")
    .max(100, "Score deve ser no máximo 100")
    .optional(),
  notes: z.string().max(1000, "Observações devem ter no máximo 1000 caracteres").optional(),
});

// Schema for linking Organization to ICP
export const organizationICPSchema = z.object({
  organizationId: z.string().min(1, "Organização é obrigatória"),
  icpId: z.string().min(1, "ICP é obrigatório"),
  matchScore: z
    .number()
    .int()
    .min(0, "Score deve ser no mínimo 0")
    .max(100, "Score deve ser no máximo 100")
    .optional(),
  notes: z.string().max(1000, "Observações devem ter no máximo 1000 caracteres").optional(),
});

// Types
export type ICPFormData = z.infer<typeof icpSchema>;
export type ICPUpdateData = z.infer<typeof icpUpdateSchema>;
export type LeadICPFormData = z.infer<typeof leadICPSchema>;
export type OrganizationICPFormData = z.infer<typeof organizationICPSchema>;
