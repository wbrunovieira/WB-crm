import { z } from "zod";

// Slug regex: only lowercase letters, numbers, and hyphens
const slugRegex = /^[a-z0-9-]+$/;

// ============ ENUMS ============

export const cadenceStatusEnum = z.enum(["draft", "active", "archived"]);
export const leadCadenceStatusEnum = z.enum(["active", "paused", "completed", "cancelled"]);

// Channel enum - maps directly to activity types
export const cadenceChannelEnum = z.enum([
  "email",
  "linkedin",
  "whatsapp",
  "call",
  "meeting",
  "instagram",
]);

// ============ CADENCE SCHEMAS ============

export const cadenceSchema = z.object({
  name: z
    .string()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(100, "Nome deve ter no máximo 100 caracteres"),
  slug: z
    .string()
    .min(2, "Slug deve ter pelo menos 2 caracteres")
    .max(50, "Slug deve ter no máximo 50 caracteres")
    .regex(slugRegex, "Slug deve conter apenas letras minúsculas, números e hífens"),
  description: z
    .string()
    .max(2000, "Descrição deve ter no máximo 2000 caracteres")
    .optional()
    .nullable(),
  objective: z
    .string()
    .max(500, "Objetivo deve ter no máximo 500 caracteres")
    .optional()
    .nullable(),
  durationDays: z
    .number()
    .int()
    .min(1, "Duração deve ser pelo menos 1 dia")
    .max(90, "Duração deve ser no máximo 90 dias")
    .default(14),
  icpId: z.string().optional().nullable(),
  status: cadenceStatusEnum.default("draft"),
});

export const cadenceUpdateSchema = z.object({
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
  description: z.string().max(2000).optional().nullable(),
  objective: z.string().max(500).optional().nullable(),
  durationDays: z.number().int().min(1).max(90).optional(),
  icpId: z.string().optional().nullable(),
  status: cadenceStatusEnum.optional(),
});

// ============ CADENCE STEP SCHEMAS ============

export const cadenceStepSchema = z.object({
  cadenceId: z.string().min(1, "Cadência é obrigatória"),
  dayNumber: z
    .number()
    .int()
    .min(1, "Dia deve ser pelo menos 1")
    .max(90, "Dia deve ser no máximo 90"),
  channel: cadenceChannelEnum,
  subject: z
    .string()
    .min(2, "Assunto deve ter pelo menos 2 caracteres")
    .max(200, "Assunto deve ter no máximo 200 caracteres"),
  description: z
    .string()
    .max(2000, "Descrição deve ter no máximo 2000 caracteres")
    .optional()
    .nullable(),
  order: z.number().int().min(0).default(0),
});

export const cadenceStepUpdateSchema = z.object({
  dayNumber: z.number().int().min(1).max(90).optional(),
  channel: cadenceChannelEnum.optional(),
  subject: z.string().min(2).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  order: z.number().int().min(0).optional(),
});

// ============ LEAD CADENCE SCHEMAS ============

export const applyLeadCadenceSchema = z.object({
  leadId: z.string().min(1, "Lead é obrigatório"),
  cadenceId: z.string().min(1, "Cadência é obrigatória"),
  startDate: z.date().optional(), // Defaults to now
  notes: z.string().max(500).optional().nullable(),
});

export const updateLeadCadenceSchema = z.object({
  status: leadCadenceStatusEnum.optional(),
  notes: z.string().max(500).optional().nullable(),
});

// ============ TYPES ============

export type CadenceFormData = z.infer<typeof cadenceSchema>;
export type CadenceUpdateData = z.infer<typeof cadenceUpdateSchema>;
export type CadenceStepFormData = z.infer<typeof cadenceStepSchema>;
export type CadenceStepUpdateData = z.infer<typeof cadenceStepUpdateSchema>;
export type ApplyLeadCadenceData = z.infer<typeof applyLeadCadenceSchema>;
export type UpdateLeadCadenceData = z.infer<typeof updateLeadCadenceSchema>;
export type CadenceStatus = z.infer<typeof cadenceStatusEnum>;
export type LeadCadenceStatus = z.infer<typeof leadCadenceStatusEnum>;
export type CadenceChannel = z.infer<typeof cadenceChannelEnum>;

// ============ LABELS ============

export const CADENCE_STATUS_LABELS: Record<CadenceStatus, string> = {
  draft: "Rascunho",
  active: "Ativa",
  archived: "Arquivada",
};

export const LEAD_CADENCE_STATUS_LABELS: Record<LeadCadenceStatus, string> = {
  active: "Ativa",
  paused: "Pausada",
  completed: "Concluída",
  cancelled: "Cancelada",
};

export const CADENCE_CHANNEL_LABELS: Record<CadenceChannel, { label: string; icon: string }> = {
  email: { label: "E-mail", icon: "✉️" },
  linkedin: { label: "LinkedIn", icon: "💼" },
  whatsapp: { label: "WhatsApp", icon: "💬" },
  call: { label: "Ligação", icon: "📞" },
  meeting: { label: "Reunião", icon: "📅" },
  instagram: { label: "Instagram", icon: "📷" },
};
