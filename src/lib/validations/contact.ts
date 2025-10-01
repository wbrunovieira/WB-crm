import { z } from "zod";

export const contactSchema = z.object({
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().optional(),
  organizationId: z.string().optional(),
});

export type ContactFormData = z.infer<typeof contactSchema>;
