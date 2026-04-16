/**
 * lead-mapping.ts
 *
 * Utilitários de mapeamento de colunas para importação de leads.
 * Sem "use server" — pode ser importado tanto por client components
 * quanto por server actions.
 */

import type { ParsedRow } from "./parse-file";
import type { LeadFormData } from "@/lib/validations/lead";

export type ColumnMapping = Record<string, keyof LeadFormData | "ignore">;

export interface ImportableField {
  value: keyof LeadFormData | "ignore";
  label: string;
  group: string;
}

/**
 * Lista de campos do CRM disponíveis para mapeamento de colunas.
 * Usada pelo frontend para montar o <select> de mapeamento.
 *
 * Para adicionar novos campos basta inserir aqui — o frontend reflete automaticamente.
 */
export const IMPORTABLE_FIELDS: ImportableField[] = [
  { value: "ignore",                label: "— Ignorar coluna —",         group: "" },
  // Empresa
  { value: "businessName",          label: "Nome comercial *",            group: "Empresa" },
  { value: "registeredName",        label: "Razão social",                group: "Empresa" },
  { value: "companyRegistrationID", label: "CNPJ",                        group: "Empresa" },
  { value: "companySize",           label: "Porte da empresa",            group: "Empresa" },
  { value: "employeesCount",        label: "Número de funcionários",      group: "Empresa" },
  { value: "revenue",               label: "Faturamento",                 group: "Empresa" },
  { value: "description",           label: "Descrição",                   group: "Empresa" },
  { value: "companyOwner",          label: "Responsável / sócio",         group: "Empresa" },
  // Contato
  { value: "phone",                 label: "Telefone",                    group: "Contato" },
  { value: "whatsapp",              label: "WhatsApp",                    group: "Contato" },
  { value: "email",                 label: "E-mail",                      group: "Contato" },
  { value: "website",               label: "Site",                        group: "Contato" },
  // Localização
  { value: "address",               label: "Endereço",                    group: "Localização" },
  { value: "city",                  label: "Cidade",                      group: "Localização" },
  { value: "state",                 label: "Estado / UF",                 group: "Localização" },
  { value: "country",               label: "País",                        group: "Localização" },
  { value: "zipCode",               label: "CEP",                         group: "Localização" },
  // Redes sociais
  { value: "instagram",             label: "Instagram",                   group: "Redes sociais" },
  { value: "linkedin",              label: "LinkedIn",                    group: "Redes sociais" },
  { value: "facebook",              label: "Facebook",                    group: "Redes sociais" },
  // Metadados de importação
  { value: "source",                label: "Fonte (ex: B2BLeads)",        group: "Importação" },
  { value: "searchTerm",            label: "Termo de busca",              group: "Importação" },
  { value: "quality",               label: "Qualidade (cold/warm/hot)",   group: "Importação" },
];

/**
 * Converte uma linha do arquivo (Record<coluna, valor>) em LeadFormData
 * conforme o mapeamento definido pelo usuário.
 *
 * - Valores vazios → undefined (não sobrescrevem defaults)
 * - Colunas mapeadas como "ignore" ou sem mapeamento → descartadas
 * - Campos numéricos (employeesCount, revenue) → convertidos automaticamente
 */
export function mapRowToLeadData(
  row: ParsedRow,
  mapping: ColumnMapping
): Partial<LeadFormData> {
  const result: Partial<LeadFormData> = {};

  for (const [coluna, campo] of Object.entries(mapping)) {
    if (campo === "ignore") continue;
    const raw = row[coluna];
    if (raw === undefined || raw === null || raw.trim() === "") continue;

    if (campo === "employeesCount") {
      const n = parseInt(raw.replace(/\D/g, ""), 10);
      if (!isNaN(n)) (result as Record<string, unknown>)[campo] = n;
    } else if (campo === "revenue") {
      const n = parseFloat(raw.replace(/[^\d,.-]/g, "").replace(",", "."));
      if (!isNaN(n)) (result as Record<string, unknown>)[campo] = n;
    } else {
      (result as Record<string, unknown>)[campo] = raw.trim();
    }
  }

  return result;
}
