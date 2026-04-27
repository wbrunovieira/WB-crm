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
 */
export const IMPORTABLE_FIELDS: ImportableField[] = [
  { value: "ignore",                label: "— Ignorar coluna —",              group: "" },
  // Empresa
  { value: "businessName",          label: "Nome comercial / fantasia *",      group: "Empresa" },
  { value: "registeredName",        label: "Razão social",                     group: "Empresa" },
  { value: "companyRegistrationID", label: "CNPJ",                             group: "Empresa" },
  { value: "companySize",           label: "Porte da empresa",                 group: "Empresa" },
  { value: "employeesCount",        label: "Número de funcionários",           group: "Empresa" },
  { value: "revenue",               label: "Faturamento (número)",             group: "Empresa" },
  { value: "revenueRange",          label: "Faixa de faturamento (texto)",     group: "Empresa" },
  { value: "equityCapital",         label: "Capital social",                   group: "Empresa" },
  { value: "foundationDate",        label: "Data de abertura / fundação",      group: "Empresa" },
  { value: "businessStatus",        label: "Situação cadastral",               group: "Empresa" },
  { value: "legalNature",           label: "Natureza jurídica",                group: "Empresa" },
  { value: "branchType",            label: "Matriz / Filial",                  group: "Empresa" },
  { value: "simplesNacional",       label: "Optante Simples Nacional",         group: "Empresa" },
  { value: "isMei",                 label: "Optante MEI",                      group: "Empresa" },
  { value: "segment",               label: "Segmento comercial",               group: "Empresa" },
  { value: "companyOwner",          label: "Responsável / sócio",              group: "Empresa" },
  { value: "description",           label: "Descrição / observação",           group: "Empresa" },
  // Contato
  { value: "phone",                 label: "Telefone principal",               group: "Contato" },
  { value: "phone2",                label: "Telefone 2 / adicional",           group: "Contato" },
  { value: "whatsapp",              label: "WhatsApp",                         group: "Contato" },
  { value: "email",                 label: "E-mail",                           group: "Contato" },
  { value: "website",               label: "Site",                             group: "Contato" },
  // Localização
  { value: "address",               label: "Endereço",                         group: "Localização" },
  { value: "vicinity",              label: "Bairro / vizinhança",              group: "Localização" },
  { value: "city",                  label: "Cidade",                           group: "Localização" },
  { value: "state",                 label: "Estado / UF",                      group: "Localização" },
  { value: "country",               label: "País",                             group: "Localização" },
  { value: "zipCode",               label: "CEP",                              group: "Localização" },
  // Redes sociais
  { value: "instagram",             label: "Instagram",                        group: "Redes sociais" },
  { value: "linkedin",              label: "LinkedIn",                         group: "Redes sociais" },
  { value: "facebook",              label: "Facebook",                         group: "Redes sociais" },
  { value: "twitter",               label: "Twitter / X",                      group: "Redes sociais" },
  { value: "tiktok",                label: "TikTok",                           group: "Redes sociais" },
  // Metadados de importação
  { value: "source",                label: "Fonte (ex: B2BLeads)",             group: "Importação" },
  { value: "searchTerm",            label: "Termo de busca",                   group: "Importação" },
  { value: "quality",               label: "Qualidade (cold/warm/hot)",        group: "Importação" },
];

// ---------------------------------------------------------------------------
// Campos booleanos — "Sim/Não" → true/false
// ---------------------------------------------------------------------------
const BOOLEAN_FIELDS = new Set<string>(["simplesNacional", "isMei"]);

// ---------------------------------------------------------------------------
// Normalização de cabeçalho para auto-sugestão
// camelCase → "camel case", underscores → espaço, remove acentos, lowercase
// ---------------------------------------------------------------------------
function normalizeHeader(header: string): string {
  return header
    .replace(/([a-z])([A-Z])/g, "$1 $2")   // camelCase → "camel Case"
    .replace(/[_\-]/g, " ")                 // snake_case, kebab-case → espaços
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")        // remove acentos
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");                  // múltiplos espaços → um
}

// ---------------------------------------------------------------------------
// Mapa de auto-sugestão (chave já normalizada)
// ---------------------------------------------------------------------------
const AUTO_SUGGEST_MAP: Record<string, string> = {
  // businessName
  "nome": "businessName",
  "nome comercial": "businessName",
  "nome fantasia": "businessName",
  "nome da empresa": "businessName",
  "empresa": "businessName",
  "company": "businessName",
  "trade name": "businessName",
  // registeredName
  "razao social": "registeredName",
  "registered name": "registeredName",
  "legal name": "registeredName",
  // companyRegistrationID
  "cnpj": "companyRegistrationID",
  "cpf cnpj": "companyRegistrationID",
  "cpf/cnpj": "companyRegistrationID",
  "registro": "companyRegistrationID",
  // foundationDate
  "data abertura": "foundationDate",
  "data de abertura": "foundationDate",
  "data fundacao": "foundationDate",
  "fundacao": "foundationDate",
  "abertura": "foundationDate",
  // businessStatus
  "situacao cadastral": "businessStatus",
  "situacao": "businessStatus",
  "status cadastral": "businessStatus",
  "status empresa": "businessStatus",
  // legalNature
  "natureza juridica": "legalNature",
  "natureza": "legalNature",
  "tipo juridico": "legalNature",
  // branchType
  "matriz filial": "branchType",
  "matriz/filial": "branchType",
  "tipo unidade": "branchType",
  "unidade": "branchType",
  // simplesNacional
  "opcao simples": "simplesNacional",
  "simples nacional": "simplesNacional",
  "optante simples": "simplesNacional",
  "simples": "simplesNacional",
  // isMei
  "opcao mei": "isMei",
  "mei": "isMei",
  "optante mei": "isMei",
  // segment
  "segmento": "segment",
  "seguimento": "segment",
  "setor": "segment",
  "ramo": "segment",
  "segmento comercial": "segment",
  // companySize
  "porte": "companySize",
  "porte da empresa": "companySize",
  "porte empresa": "companySize",
  "company size": "companySize",
  // employeesCount
  "quantidade funcionarios": "employeesCount",
  "numero funcionarios": "employeesCount",
  "funcionarios": "employeesCount",
  "employees": "employeesCount",
  "qtd funcionarios": "employeesCount",
  // revenue
  "faturamento": "revenue",
  "receita": "revenue",
  "revenue": "revenue",
  // revenueRange
  "faixa faturamento": "revenueRange",
  "faixa de faturamento": "revenueRange",
  "faixa receita": "revenueRange",
  // equityCapital
  "capital social": "equityCapital",
  "capital": "equityCapital",
  "equity capital": "equityCapital",
  // companyOwner
  "responsavel": "companyOwner",
  "socio": "companyOwner",
  "socios": "companyOwner",
  "proprietario": "companyOwner",
  "owner": "companyOwner",
  "responsavel socio": "companyOwner",
  // phone
  "telefone": "phone",
  "telefone 1": "phone",
  "telefone1": "phone",
  "fone": "phone",
  "fone 1": "phone",
  "tel": "phone",
  "phone": "phone",
  "celular": "phone",
  "contato": "phone",
  // phone2
  "telefone 2": "phone2",
  "telefone2": "phone2",
  "fone 2": "phone2",
  "outros telefones": "phone2",
  "telefone adicional": "phone2",
  "phone2": "phone2",
  "tel 2": "phone2",
  // whatsapp
  "whatsapp": "whatsapp",
  "zap": "whatsapp",
  "wpp": "whatsapp",
  // email
  "email": "email",
  "e mail": "email",
  "e-mail": "email",
  "endereco de email": "email",
  "outros emails": "email",
  "outros e mails": "email",
  // website
  "site": "website",
  "website": "website",
  "url": "website",
  "pagina": "website",
  "homepage": "website",
  // address
  "endereco": "address",
  "logradouro": "address",
  "address": "address",
  "rua": "address",
  // vicinity
  "bairro": "vicinity",
  "vizinhanca": "vicinity",
  "neighborhood": "vicinity",
  // city
  "cidade": "city",
  "municipio": "city",
  "city": "city",
  // state
  "estado": "state",
  "uf": "state",
  "state": "state",
  // country
  "pais": "country",
  "country": "country",
  // zipCode
  "cep": "zipCode",
  "codigo postal": "zipCode",
  "zip": "zipCode",
  "zipcode": "zipCode",
  // source
  "fonte": "source",
  "source": "source",
  "origem": "source",
  // searchTerm
  "termo de busca": "searchTerm",
  "termo": "searchTerm",
  "palavra chave": "searchTerm",
  // instagram
  "instagram": "instagram",
  // linkedin
  "linkedin": "linkedin",
  // facebook
  "facebook": "facebook",
  // twitter
  "twitter": "twitter",
  "x": "twitter",
  // tiktok
  "tiktok": "tiktok",
  // description
  "descricao": "description",
  "description": "description",
  "observacao": "description",
  "obs": "description",
  "observacoes": "description",
};

export function autoSuggestField(header: string): string {
  const normalized = normalizeHeader(header);
  return AUTO_SUGGEST_MAP[normalized] ?? "ignore";
}

export function buildInitialMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  for (const h of headers) {
    const suggested = autoSuggestField(h);
    mapping[h] = suggested as ColumnMapping[string];
  }
  return mapping;
}

// ---------------------------------------------------------------------------
// Tenta parsear data em formatos DD/MM/YYYY ou YYYY-MM-DD
// ---------------------------------------------------------------------------
function parseImportDate(raw: string): Date | undefined {
  // DD/MM/YYYY
  const dmyMatch = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    const dt = new Date(`${y}-${m}-${d}T00:00:00.000Z`);
    if (!isNaN(dt.getTime())) return dt;
  }
  // YYYY-MM-DD
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const dt = new Date(`${raw}T00:00:00.000Z`);
    if (!isNaN(dt.getTime())) return dt;
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Extrai o primeiro telefone de uma lista separada por vírgula ou pipe
// ---------------------------------------------------------------------------
function extractFirstPhone(raw: string): string {
  return raw.split(/[,|]/).map((s) => s.trim()).filter(Boolean)[0] ?? raw.trim();
}

/**
 * Converte uma linha do arquivo em LeadFormData conforme o mapeamento definido.
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
    } else if (campo === "revenue" || campo === "equityCapital") {
      const n = parseFloat(raw.replace(/[^\d,.-]/g, "").replace(",", "."));
      if (!isNaN(n)) (result as Record<string, unknown>)[campo] = n;
    } else if (campo === "foundationDate") {
      const dt = parseImportDate(raw.trim());
      if (dt) (result as Record<string, unknown>)[campo] = dt;
      else (result as Record<string, unknown>)[campo] = raw.trim(); // fallback: string
    } else if (BOOLEAN_FIELDS.has(campo)) {
      const v = raw.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      (result as Record<string, unknown>)[campo] = v === "sim" || v === "yes" || v === "true" || v === "1";
    } else if (campo === "phone" || campo === "phone2" || campo === "whatsapp") {
      (result as Record<string, unknown>)[campo] = extractFirstPhone(raw);
    } else {
      (result as Record<string, unknown>)[campo] = raw.trim();
    }
  }

  return result;
}
