import { z } from "zod";

export const pipelineSchema = z.object({
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  isDefault: z.boolean().optional(),
});

export const stageSchema = z.object({
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  order: z.number().min(0, "Ordem deve ser maior ou igual a 0"),
  probability: z
    .number()
    .min(0, "Probabilidade deve ser entre 0 e 100")
    .max(100, "Probabilidade deve ser entre 0 e 100"),
  pipelineId: z.string(),
});

export type PipelineFormData = z.infer<typeof pipelineSchema>;
export type StageFormData = z.infer<typeof stageSchema>;
