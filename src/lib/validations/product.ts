import { z } from "zod";

export const productSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(100),
  slug: z
    .string()
    .min(1, "Slug é obrigatório")
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Slug deve conter apenas letras minúsculas, números e hífens"),
  description: z.string().max(1000).optional().nullable(),
  businessLineId: z.string().cuid("Linha de negócio é obrigatória"),
  basePrice: z.number().min(0).optional().nullable(),
  currency: z.string().length(3).default("BRL"),
  pricingType: z.enum(["fixed", "hourly", "monthly", "custom"]).optional().nullable(),
  isActive: z.boolean().default(true),
  order: z.number().int().min(0).default(0),
});

export const productUpdateSchema = productSchema.partial().extend({
  id: z.string().cuid(),
});

// Schemas para vincular produtos

export const leadProductSchema = z.object({
  leadId: z.string().cuid(),
  productId: z.string().cuid(),
  interestLevel: z.enum(["high", "medium", "low"]).optional().nullable(),
  estimatedValue: z.number().min(0).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export const organizationProductSchema = z.object({
  organizationId: z.string().cuid(),
  productId: z.string().cuid(),
  status: z.enum(["interested", "purchased", "declined"]).default("interested"),
  firstPurchaseAt: z.date().optional().nullable(),
  lastPurchaseAt: z.date().optional().nullable(),
  totalPurchases: z.number().int().min(0).default(0),
  totalRevenue: z.number().min(0).default(0),
  notes: z.string().max(1000).optional().nullable(),
});

export const dealProductSchema = z.object({
  dealId: z.string().cuid(),
  productId: z.string().cuid(),
  quantity: z.number().int().min(1).default(1),
  unitPrice: z.number().min(0, "Preço unitário é obrigatório"),
  discount: z.number().min(0).default(0),
  totalValue: z.number().min(0),
  description: z.string().max(1000).optional().nullable(),
  deliveryTime: z.number().int().min(0).optional().nullable(),
});

export const partnerProductSchema = z.object({
  partnerId: z.string().cuid(),
  productId: z.string().cuid(),
  expertiseLevel: z.enum(["basic", "intermediate", "expert"]).optional().nullable(),
  canRefer: z.boolean().default(true),
  canDeliver: z.boolean().default(false),
  commissionType: z.enum(["percentage", "fixed"]).optional().nullable(),
  commissionValue: z.number().min(0).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export type ProductFormData = z.infer<typeof productSchema>;
export type ProductUpdateData = z.infer<typeof productUpdateSchema>;
export type LeadProductFormData = z.infer<typeof leadProductSchema>;
export type OrganizationProductFormData = z.infer<typeof organizationProductSchema>;
export type DealProductFormData = z.infer<typeof dealProductSchema>;
export type PartnerProductFormData = z.infer<typeof partnerProductSchema>;
