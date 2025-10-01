import { z } from "zod";

export const dealSchema = z.object({
  title: z.string().min(2, "Título deve ter no mínimo 2 caracteres"),
  value: z.number().min(0, "Valor deve ser maior ou igual a zero"),
  currency: z.string().default("BRL"),
  status: z.enum(["open", "won", "lost"]).default("open"),
  stageId: z.string().min(1, "Estágio é obrigatório"),
  contactId: z.string().optional().nullable(),
  organizationId: z.string().optional().nullable(),
  expectedCloseDate: z.date().optional().nullable(),
});

export type DealFormData = z.infer<typeof dealSchema>;
