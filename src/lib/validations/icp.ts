import { z } from "zod";

// Slug regex: only lowercase letters, numbers, and hyphens
const slugRegex = /^[a-z0-9-]+$/;

// ICP status enum
const icpStatusEnum = z.enum(["draft", "active", "archived"]);

// ============ ICP LINK ENUMS ============

// Essential Fields
export const icpFitStatusEnum = z.enum(["ideal", "partial", "out_of_icp"]);

export const realDecisionMakerEnum = z.enum([
  "founder_ceo",
  "tech_partner",
  "commercial_partner",
  "other",
]);

export const businessMomentEnum = z.enum([
  "validation",
  "growth",
  "scale",
  "consolidation",
]);

// Urgency levels with descriptive labels
export const perceivedUrgencyEnum = z.enum([
  "curiosity",           // 1 - Curiosidade
  "interest",            // 2 - Interesse
  "future_need",         // 3 - Necessidade futura
  "current_need",        // 4 - Necessidade atual
  "active_pain",         // 5 - Dor ativa / precisa resolver agora
]);

// Specific Fields
export const currentPlatformEnum = z.enum([
  "hotmart",
  "cademi",
  "moodle",
  "own_lms",
  "scattered_tools",
  "other",
]);

export const mainDeclaredPainEnum = z.enum([
  "student_experience",
  "operational_fragmentation",
  "lack_of_identity",
  "growth_limitation",
  "founder_emotional_pain",
]);

export const strategicDesireEnum = z.enum([
  "total_control",
  "own_identity",
  "scale_without_chaos",
  "unify_operation",
  "market_differentiation",
]);

// Strategic Fields
export const nonClosingReasonEnum = z.enum([
  "priority_changed",
  "budget",
  "timing",
  "internal_decision",
  "not_icp",
  "other",
]);

export const estimatedDecisionTimeEnum = z.enum([
  "less_than_2_weeks",
  "2_to_4_weeks",
  "1_to_2_months",
  "3_plus_months",
]);

// ============ ICP SCHEMAS ============

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

// ============ ICP LINK EXTENDED FIELDS (shared) ============

const icpLinkExtendedFields = {
  // Match Score & Notes (existing)
  matchScore: z
    .number()
    .int()
    .min(0, "Score deve ser no mínimo 0")
    .max(100, "Score deve ser no máximo 100")
    .nullish(),
  notes: z.string().max(1000, "Observações devem ter no máximo 1000 caracteres").nullish(),

  // Essential Fields
  icpFitStatus: icpFitStatusEnum.nullish(),
  realDecisionMaker: realDecisionMakerEnum.nullish(),
  realDecisionMakerOther: z.string().max(100).nullish(),
  perceivedUrgency: z.array(perceivedUrgencyEnum).nullish(),
  businessMoment: z.array(businessMomentEnum).nullish(),

  // Specific Fields
  currentPlatforms: z.array(currentPlatformEnum).nullish(),
  fragmentationLevel: z.number().int().min(0).max(10).nullish(),
  mainDeclaredPain: mainDeclaredPainEnum.nullish(),
  strategicDesire: strategicDesireEnum.nullish(),
  perceivedTechnicalComplexity: z.number().int().min(1).max(5).nullish(),

  // Strategic Fields
  purchaseTrigger: z.string().max(500, "Gatilho deve ter no máximo 500 caracteres").nullish(),
  nonClosingReason: nonClosingReasonEnum.nullish(),
  estimatedDecisionTime: estimatedDecisionTimeEnum.nullish(),
  expansionPotential: z.number().int().min(1).max(5).nullish(),
};

// ============ LEAD ICP SCHEMAS ============

// Basic schema for linking Lead to ICP (backwards compatible)
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

// Extended schema with all categorization fields
export const leadICPExtendedSchema = z.object({
  leadId: z.string().min(1, "Lead é obrigatório"),
  icpId: z.string().min(1, "ICP é obrigatório"),
  ...icpLinkExtendedFields,
});

// ============ ORGANIZATION ICP SCHEMAS ============

// Basic schema for linking Organization to ICP (backwards compatible)
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

// Extended schema with all categorization fields
export const organizationICPExtendedSchema = z.object({
  organizationId: z.string().min(1, "Organização é obrigatória"),
  icpId: z.string().min(1, "ICP é obrigatório"),
  ...icpLinkExtendedFields,
});

// ============ TYPES ============

export type ICPFormData = z.infer<typeof icpSchema>;
export type ICPUpdateData = z.infer<typeof icpUpdateSchema>;
export type LeadICPFormData = z.infer<typeof leadICPSchema>;
export type LeadICPExtendedFormData = z.infer<typeof leadICPExtendedSchema>;
export type OrganizationICPFormData = z.infer<typeof organizationICPSchema>;
export type OrganizationICPExtendedFormData = z.infer<typeof organizationICPExtendedSchema>;

// Enum types for use in components
export type ICPFitStatus = z.infer<typeof icpFitStatusEnum>;
export type RealDecisionMaker = z.infer<typeof realDecisionMakerEnum>;
export type BusinessMoment = z.infer<typeof businessMomentEnum>;
export type CurrentPlatform = z.infer<typeof currentPlatformEnum>;
export type MainDeclaredPain = z.infer<typeof mainDeclaredPainEnum>;
export type StrategicDesire = z.infer<typeof strategicDesireEnum>;
export type NonClosingReason = z.infer<typeof nonClosingReasonEnum>;
export type EstimatedDecisionTime = z.infer<typeof estimatedDecisionTimeEnum>;
export type PerceivedUrgency = z.infer<typeof perceivedUrgencyEnum>;
