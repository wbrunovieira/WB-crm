import { z } from "zod";

export const activitySchema = z.object({
  type: z.enum(["call", "meeting", "email", "task", "whatsapp", "visit", "instagram"], {
    required_error: "Tipo de atividade é obrigatório",
  }),
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
