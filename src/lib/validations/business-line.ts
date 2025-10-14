import { z } from "zod";

export const businessLineSchema = z.object({
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
  isActive: z.boolean().default(true),
  order: z.number().int().min(0).default(0),
});

export const businessLineUpdateSchema = businessLineSchema.partial().extend({
  id: z.string().cuid(),
});

export type BusinessLineFormData = z.infer<typeof businessLineSchema>;
export type BusinessLineUpdateData = z.infer<typeof businessLineUpdateSchema>;
