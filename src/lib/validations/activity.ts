import { z } from "zod";

// Activity types enum - used for validation and UI
export const activityTypeEnum = z.enum([
  "call",
  "meeting",
  "email",
  "task",
  "whatsapp",
  "visit",
  "instagram",
  "linkedin",
]);

export type ActivityType = z.infer<typeof activityTypeEnum>;

// Labels for activity types (Portuguese)
export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  call: "Ligação",
  meeting: "Reunião",
  email: "Email",
  task: "Tarefa",
  whatsapp: "WhatsApp",
  visit: "Visita",
  instagram: "Instagram",
  linkedin: "LinkedIn",
};

export const activitySchema = z.object({
  type: activityTypeEnum.describe("Tipo de atividade é obrigatório"),
  subject: z.string().min(2, "Assunto deve ter no mínimo 2 caracteres"),
  description: z.string().optional(),
  dueDate: z.date().optional().nullable(),
  completed: z.boolean().default(false),
  dealId: z.string().optional().nullable(),
  contactId: z.string().optional().nullable(),
  contactIds: z.array(z.string()).optional().nullable(),
  leadId: z.string().optional().nullable(),
  partnerId: z.string().optional().nullable(),
});

export type ActivityFormData = z.infer<typeof activitySchema>;
