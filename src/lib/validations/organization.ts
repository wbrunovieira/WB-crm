import { z } from "zod";

export const organizationSchema = z.object({
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  domain: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
});

export type OrganizationFormData = z.infer<typeof organizationSchema>;
