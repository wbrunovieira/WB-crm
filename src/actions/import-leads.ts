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
import { mapRowToLeadData, type ColumnMapping } from "@/lib/import/lead-mapping";
export type { ColumnMapping };

// ---------------------------------------------------------------------------
// Tipos públicos
// ---------------------------------------------------------------------------

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
