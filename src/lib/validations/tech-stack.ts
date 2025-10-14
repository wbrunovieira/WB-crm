import { z } from "zod";

// ========== TECH CATEGORY ==========

export const techCategorySchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(100),
  slug: z
    .string()
    .min(1, "Slug é obrigatório")
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Slug deve conter apenas letras minúsculas, números e hífens"),
  description: z.string().max(500).optional().nullable(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Cor deve ser um hex válido (ex: #792990)")
    .optional()
    .nullable(),
  icon: z.string().max(50).optional().nullable(),
  order: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const techCategoryUpdateSchema = techCategorySchema.partial().extend({
  id: z.string().cuid(),
});

export type TechCategoryFormData = z.infer<typeof techCategorySchema>;
export type TechCategoryUpdateData = z.infer<typeof techCategoryUpdateSchema>;

// ========== TECH LANGUAGE ==========

export const techLanguageSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(100),
  slug: z
    .string()
    .min(1, "Slug é obrigatório")
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Slug deve conter apenas letras minúsculas, números e hífens"),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Cor deve ser um hex válido (ex: #F7DF1E)")
    .optional()
    .nullable(),
  icon: z.string().max(200).optional().nullable(),
  isActive: z.boolean().default(true),
});

export const techLanguageUpdateSchema = techLanguageSchema.partial().extend({
  id: z.string().cuid(),
});

export type TechLanguageFormData = z.infer<typeof techLanguageSchema>;
export type TechLanguageUpdateData = z.infer<typeof techLanguageUpdateSchema>;

// ========== TECH FRAMEWORK ==========

export const techFrameworkSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(100),
  slug: z
    .string()
    .min(1, "Slug é obrigatório")
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Slug deve conter apenas letras minúsculas, números e hífens"),
  languageSlug: z.string().max(50).optional().nullable(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Cor deve ser um hex válido (ex: #61DAFB)")
    .optional()
    .nullable(),
  icon: z.string().max(200).optional().nullable(),
  isActive: z.boolean().default(true),
});

export const techFrameworkUpdateSchema = techFrameworkSchema.partial().extend({
  id: z.string().cuid(),
});

export type TechFrameworkFormData = z.infer<typeof techFrameworkSchema>;
export type TechFrameworkUpdateData = z.infer<typeof techFrameworkUpdateSchema>;

// ========== DEAL TECH STACK LINKS ==========

export const dealTechStackSchema = z.object({
  dealId: z.string().cuid(),
  techCategoryId: z.string().cuid(),
});

export const dealLanguageSchema = z.object({
  dealId: z.string().cuid(),
  languageId: z.string().cuid(),
  isPrimary: z.boolean().default(false),
});

export const dealFrameworkSchema = z.object({
  dealId: z.string().cuid(),
  frameworkId: z.string().cuid(),
});

export type DealTechStackFormData = z.infer<typeof dealTechStackSchema>;
export type DealLanguageFormData = z.infer<typeof dealLanguageSchema>;
export type DealFrameworkFormData = z.infer<typeof dealFrameworkSchema>;
