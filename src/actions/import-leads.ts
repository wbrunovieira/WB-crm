"use server";

/**
 * import-leads.ts
 *
 * Server action para importação em massa de leads a partir de arquivos externos
 * (CSV, Excel, ou qualquer fonte que produza rows + mapping).
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ FLUXO DE IMPORTAÇÃO                                                      │
 * │                                                                          │
 * │  1. Caller envia `rows` (linhas do arquivo) + `mapping` (colunas→campos) │
 * │  2. Para cada linha:                                                     │
 * │     a. Linhas com todos os campos vazios → skipped                       │
 * │     b. mapRowToLeadData() converte para LeadFormData                     │
 * │     c. createLeadWithContacts() cria o lead (inclui validação Zod)       │
 * │        → status 'duplicate_found' → linha vai para duplicateDetails      │
 * │        → status 'created'         → created++                            │
 * │        → exceção Zod/DB           → linha vai para errorDetails          │
 * │  3. Retorna ImportResult com o resumo completo                           │
 * │                                                                          │
 * │ INTEGRAÇÃO COM NOVAS FONTES (B2BLeads, Speedio, Econodata, etc.)         │
 * │   Qualquer fonte que produza rows + mapping pode usar este action.       │
 * │   O caller decide como tratar duplicatas:                                │
 * │     - importLeads({ ..., skipDuplicateCheck: true }) para forçar criação │
 * │     - Revisar duplicateDetails e re-importar somente os desejados        │
 * │                                                                          │
 * │ CAMPOS DISPONÍVEIS PARA MAPEAMENTO → ver IMPORTABLE_FIELDS abaixo        │
 * └──────────────────────────────────────────────────────────────────────────┘
 */

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createLeadWithContacts, type LeadDuplicates } from "@/actions/leads";
import type { ParsedRow } from "@/lib/import/parse-file";
import type { LeadFormData } from "@/lib/validations/lead";

// ---------------------------------------------------------------------------
// Tipos públicos
// ---------------------------------------------------------------------------

/**
 * Mapeamento de colunas do arquivo para campos do CRM.
 * Chave: nome da coluna no arquivo (ex: "Nome da Empresa")
 * Valor: campo do CRM (ex: "businessName") ou "ignore" para ignorar a coluna
 */
export type ColumnMapping = Record<string, keyof LeadFormData | "ignore">;

export interface ImportLeadsInput {
  rows: ParsedRow[];
  mapping: ColumnMapping;
  /** Se true, cria leads mesmo quando duplicatas são detectadas */
  skipDuplicateCheck?: boolean;
  /** Fonte padrão para todas as linhas (sobrescrita pelo campo mapeado, se houver) */
  defaultSource?: string;
}

export interface DuplicateDetail {
  rowIndex: number;
  row: ParsedRow;
  matches: LeadDuplicates;
}

export interface ErrorDetail {
  rowIndex: number;
  row: ParsedRow;
  message: string;
}

export interface ImportResult {
  total: number;
  created: number;
  duplicates: number;
  errors: number;
  /** Linhas com todos os campos mapeados vazios */
  skipped: number;
  duplicateDetails: DuplicateDetail[];
  errorDetails: ErrorDetail[];
  /** Presente somente em caso de erro de autenticação */
  error?: string;
}

// ---------------------------------------------------------------------------
// Campos importáveis — usados pelo frontend para montar o select de mapeamento
// ---------------------------------------------------------------------------

export interface ImportableField {
  value: keyof LeadFormData | "ignore";
  label: string;
  group: string;
}

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

// ---------------------------------------------------------------------------
// Função pura: mapeia uma linha do arquivo para LeadFormData
// ---------------------------------------------------------------------------

/**
 * Converte uma linha do arquivo (Record<coluna, valor>) em LeadFormData
 * conforme o mapeamento definido pelo usuário.
 *
 * Valores vazios são convertidos para undefined (não sobrescrevem defaults).
 * Colunas mapeadas como "ignore" ou sem mapeamento são descartadas.
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

    // Campo numérico: employeesCount, revenue
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

// ---------------------------------------------------------------------------
// Server action principal
// ---------------------------------------------------------------------------

export async function importLeads(input: ImportLeadsInput): Promise<ImportResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return emptyResult({ error: "Não autorizado" });
  }

  const { rows, mapping, skipDuplicateCheck = false, defaultSource } = input;

  const result: ImportResult = {
    total: rows.length,
    created: 0,
    duplicates: 0,
    errors: 0,
    skipped: 0,
    duplicateDetails: [],
    errorDetails: [],
  };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    // 1. Mapeia a linha para LeadFormData
    const leadData = mapRowToLeadData(row, mapping);

    // Aplica fonte padrão se não mapeada na linha
    if (!leadData.source && defaultSource) {
      leadData.source = defaultSource;
    }

    // 2. Verifica se todos os campos relevantes estão vazios
    const hasContent = Object.values(leadData).some(
      (v) => v !== undefined && v !== null && String(v).trim() !== ""
    );
    if (!hasContent) {
      result.skipped++;
      continue;
    }

    // 3. businessName é obrigatório — linhas sem ele são erros
    if (!leadData.businessName) {
      result.errors++;
      result.errorDetails.push({
        rowIndex: i,
        row,
        message: "Nome comercial (businessName) é obrigatório",
      });
      continue;
    }

    // 4. Chama createLeadWithContacts (inclui validação Zod + detecção de duplicidade)
    try {
      const createResult = await createLeadWithContacts(
        leadData as LeadFormData,
        [],
        { skipDuplicateCheck }
      );

      if (createResult.status === "duplicate_found") {
        result.duplicates++;
        result.duplicateDetails.push({
          rowIndex: i,
          row,
          matches: createResult.duplicates,
        });
      } else {
        result.created++;
      }
    } catch (err) {
      result.errors++;
      result.errorDetails.push({
        rowIndex: i,
        row,
        message: err instanceof Error ? err.message : "Erro desconhecido",
      });
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function emptyResult(overrides: Partial<ImportResult> = {}): ImportResult {
  return {
    total: 0,
    created: 0,
    duplicates: 0,
    errors: 0,
    skipped: 0,
    duplicateDetails: [],
    errorDetails: [],
    ...overrides,
  };
}
