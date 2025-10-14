import { z } from "zod";

// ========== TECH PROFILE LANGUAGE ==========

export const techProfileLanguageSchema = z.object({
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
  order: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const techProfileLanguageUpdateSchema = techProfileLanguageSchema.partial().extend({
  id: z.string().cuid(),
});

export type TechProfileLanguageFormData = z.infer<typeof techProfileLanguageSchema>;
export type TechProfileLanguageUpdateData = z.infer<typeof techProfileLanguageUpdateSchema>;

// ========== TECH PROFILE FRAMEWORK ==========

export const techProfileFrameworkSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(100),
  slug: z
    .string()
    .min(1, "Slug é obrigatório")
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Slug deve conter apenas letras minúsculas, números e hífens"),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Cor deve ser um hex válido (ex: #61DAFB)")
    .optional()
    .nullable(),
  icon: z.string().max(200).optional().nullable(),
  order: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const techProfileFrameworkUpdateSchema = techProfileFrameworkSchema.partial().extend({
  id: z.string().cuid(),
});

export type TechProfileFrameworkFormData = z.infer<typeof techProfileFrameworkSchema>;
export type TechProfileFrameworkUpdateData = z.infer<typeof techProfileFrameworkUpdateSchema>;

// ========== TECH PROFILE HOSTING ==========

export const techProfileHostingSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(100),
  slug: z
    .string()
    .min(1, "Slug é obrigatório")
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Slug deve conter apenas letras minúsculas, números e hífens"),
  type: z.enum(["cloud", "vps", "shared", "dedicated", "serverless"], {
    errorMap: () => ({ message: "Tipo inválido" }),
  }),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Cor deve ser um hex válido")
    .optional()
    .nullable(),
  icon: z.string().max(200).optional().nullable(),
  order: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const techProfileHostingUpdateSchema = techProfileHostingSchema.partial().extend({
  id: z.string().cuid(),
});

export type TechProfileHostingFormData = z.infer<typeof techProfileHostingSchema>;
export type TechProfileHostingUpdateData = z.infer<typeof techProfileHostingUpdateSchema>;

// ========== TECH PROFILE DATABASE ==========

export const techProfileDatabaseSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(100),
  slug: z
    .string()
    .min(1, "Slug é obrigatório")
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Slug deve conter apenas letras minúsculas, números e hífens"),
  type: z.enum(["relational", "nosql", "cache", "search"], {
    errorMap: () => ({ message: "Tipo inválido" }),
  }),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Cor deve ser um hex válido")
    .optional()
    .nullable(),
  icon: z.string().max(200).optional().nullable(),
  order: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const techProfileDatabaseUpdateSchema = techProfileDatabaseSchema.partial().extend({
  id: z.string().cuid(),
});

export type TechProfileDatabaseFormData = z.infer<typeof techProfileDatabaseSchema>;
export type TechProfileDatabaseUpdateData = z.infer<typeof techProfileDatabaseUpdateSchema>;

// ========== TECH PROFILE ERP ==========

export const techProfileERPSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(100),
  slug: z
    .string()
    .min(1, "Slug é obrigatório")
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Slug deve conter apenas letras minúsculas, números e hífens"),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Cor deve ser um hex válido")
    .optional()
    .nullable(),
  icon: z.string().max(200).optional().nullable(),
  order: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const techProfileERPUpdateSchema = techProfileERPSchema.partial().extend({
  id: z.string().cuid(),
});

export type TechProfileERPFormData = z.infer<typeof techProfileERPSchema>;
export type TechProfileERPUpdateData = z.infer<typeof techProfileERPUpdateSchema>;

// ========== TECH PROFILE CRM ==========

export const techProfileCRMSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(100),
  slug: z
    .string()
    .min(1, "Slug é obrigatório")
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Slug deve conter apenas letras minúsculas, números e hífens"),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Cor deve ser um hex válido")
    .optional()
    .nullable(),
  icon: z.string().max(200).optional().nullable(),
  order: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const techProfileCRMUpdateSchema = techProfileCRMSchema.partial().extend({
  id: z.string().cuid(),
});

export type TechProfileCRMFormData = z.infer<typeof techProfileCRMSchema>;
export type TechProfileCRMUpdateData = z.infer<typeof techProfileCRMUpdateSchema>;

// ========== TECH PROFILE ECOMMERCE ==========

export const techProfileEcommerceSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(100),
  slug: z
    .string()
    .min(1, "Slug é obrigatório")
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Slug deve conter apenas letras minúsculas, números e hífens"),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Cor deve ser um hex válido")
    .optional()
    .nullable(),
  icon: z.string().max(200).optional().nullable(),
  order: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const techProfileEcommerceUpdateSchema = techProfileEcommerceSchema.partial().extend({
  id: z.string().cuid(),
});

export type TechProfileEcommerceFormData = z.infer<typeof techProfileEcommerceSchema>;
export type TechProfileEcommerceUpdateData = z.infer<typeof techProfileEcommerceUpdateSchema>;
