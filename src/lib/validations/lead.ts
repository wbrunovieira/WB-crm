import { z } from "zod";

export const leadSchema = z.object({
  googleId: z.string().optional(),

  // Informações Básicas da Empresa
  businessName: z.string().min(2, "Nome comercial deve ter no mínimo 2 caracteres"),
  registeredName: z.string().optional(),
  foundationDate: z.date().optional(),
  companyRegistrationID: z.string().optional(),

  // Localização
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  zipCode: z.string().optional(),
  vicinity: z.string().optional(),

  // Contato da Empresa
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  website: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),

  // Redes Sociais
  instagram: z.string().optional(),
  linkedin: z.string().optional(),
  facebook: z.string().optional(),
  twitter: z.string().optional(),
  tiktok: z.string().optional(),

  // Informações do Google Places
  categories: z.string().optional(),
  rating: z.number().min(0).max(5).optional(),
  priceLevel: z.number().int().min(0).max(4).optional(),
  userRatingsTotal: z.number().int().optional(),
  permanentlyClosed: z.boolean().optional(),
  types: z.string().optional(),

  // Informações da Empresa
  companyOwner: z.string().optional(),
  companySize: z.string().optional(),
  revenue: z.number().positive().optional(),
  employeesCount: z.number().int().positive().optional(),
  description: z.string().optional(),
  equityCapital: z.number().positive().optional(),
  businessStatus: z.string().optional(),

  // Atividades
  primaryActivity: z.string().optional(),
  secondaryActivities: z.string().optional(),
  primaryCNAEId: z.string().optional(),
  internationalActivity: z.string().optional(),

  // Metadados da Busca
  source: z.string().optional(),
  quality: z.enum(["cold", "warm", "hot"]).optional(),
  searchTerm: z.string().optional(),
  fieldsFilled: z.number().int().optional(),
  category: z.string().optional(),
  radius: z.number().int().optional(),

  // Status
  status: z.enum(["new", "contacted", "qualified", "disqualified"]).optional(),

  // Labels (multiple)
  labelIds: z.array(z.string()).optional(),
});

export const leadContactSchema = z.object({
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  role: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  isPrimary: z.boolean().optional(),
});

export type LeadFormData = z.infer<typeof leadSchema>;
export type LeadContactFormData = z.infer<typeof leadContactSchema>;
