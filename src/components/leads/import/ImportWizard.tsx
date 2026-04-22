"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api-client";
import { IMPORTABLE_FIELDS, type ColumnMapping } from "@/lib/import/lead-mapping";
import { mapRowToLeadData } from "@/lib/import/lead-mapping";
import { parseCSV, parseXLSX, type ParsedImportFile, type ParsedRow } from "@/lib/import/parse-file";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Step = 1 | 2 | 3;

interface DuplicateMatchItem {
  id: string;
  businessName: string;
}

interface LeadDuplicates {
  cnpj: DuplicateMatchItem[];
  name: DuplicateMatchItem[];
  phone: DuplicateMatchItem[];
  email: DuplicateMatchItem[];
  address: DuplicateMatchItem[];
}

export interface DuplicateDetail {
  rowIndex: number;
  row: ParsedRow;
  matches: LeadDuplicates;
}

interface ErrorDetail {
  rowIndex: number;
  row: ParsedRow;
  message: string;
}

export interface ImportResult {
  total: number;
  created: number;
  duplicates: number;
  errors: number;
  skipped: number;
  duplicateDetails: DuplicateDetail[];
  errorDetails: ErrorDetail[];
  error?: string;
}

// ---------------------------------------------------------------------------
// Auto-suggest: map common column names to CRM fields
// ---------------------------------------------------------------------------

const AUTO_SUGGEST_MAP: Record<string, string> = {
  // businessName
  nome: "businessName",
  "nome da empresa": "businessName",
  "nome comercial": "businessName",
  empresa: "businessName",
  company: "businessName",
  // registeredName
  "razao social": "registeredName",
  "razão social": "registeredName",
  "registered name": "registeredName",
  // companyRegistrationID
  cnpj: "companyRegistrationID",
  "cpf/cnpj": "companyRegistrationID",
  "registro": "companyRegistrationID",
  // phone
  telefone: "phone",
  fone: "phone",
  tel: "phone",
  phone: "phone",
  // whatsapp
  whatsapp: "whatsapp",
  zap: "whatsapp",
  // email
  email: "email",
  "e-mail": "email",
  "endereço de email": "email",
  // website
  site: "website",
  website: "website",
  url: "website",
  "página": "website",
  // address
  endereço: "address",
  endereco: "address",
  logradouro: "address",
  address: "address",
  rua: "address",
  // city
  cidade: "city",
  municipio: "city",
  município: "city",
  city: "city",
  // state
  estado: "state",
  uf: "state",
  state: "state",
  // country
  país: "country",
  pais: "country",
  country: "country",
  // zipCode
  cep: "zipCode",
  "código postal": "zipCode",
  "codigo postal": "zipCode",
  zip: "zipCode",
  // source
  fonte: "source",
  source: "source",
  origem: "source",
  // searchTerm
  "termo de busca": "searchTerm",
  "termo": "searchTerm",
  "palavra-chave": "searchTerm",
  // instagram
  instagram: "instagram",
  // linkedin
  linkedin: "linkedin",
  // facebook
  facebook: "facebook",
  // companyOwner
  responsavel: "companyOwner",
  responsável: "companyOwner",
  "sócio": "companyOwner",
  socio: "companyOwner",
  // description
  descricao: "description",
  descrição: "description",
  description: "description",
  observacao: "description",
  observação: "description",
  obs: "description",
};

function autoSuggestField(header: string): string {
  const normalized = header.toLowerCase().trim();
  return AUTO_SUGGEST_MAP[normalized] ?? "ignore";
}

function buildInitialMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  for (const h of headers) {
    const suggested = autoSuggestField(h);
    mapping[h] = suggested as ColumnMapping[string];
  }
  return mapping;
}

// ---------------------------------------------------------------------------
// Group IMPORTABLE_FIELDS by group
// ---------------------------------------------------------------------------

interface FieldGroup {
  name: string;
  fields: typeof IMPORTABLE_FIELDS;
}

function groupFields(): FieldGroup[] {
  const ignoreField = IMPORTABLE_FIELDS.find((f) => f.value === "ignore");
  const grouped: Record<string, typeof IMPORTABLE_FIELDS> = {};

  for (const f of IMPORTABLE_FIELDS) {
    if (f.value === "ignore") continue;
    if (!grouped[f.group]) grouped[f.group] = [];
    grouped[f.group].push(f);
  }

  return [
    ...(ignoreField ? [{ name: "", fields: [ignoreField] }] : []),
    ...Object.entries(grouped).map(([name, fields]) => ({ name, fields })),
  ];
}

const FIELD_GROUPS = groupFields();

// ---------------------------------------------------------------------------
// Step indicator
// ---------------------------------------------------------------------------

function StepIndicator({ currentStep }: { currentStep: Step }) {
  const steps = [
    { number: 1, label: "Upload" },
    { number: 2, label: "Mapeamento" },
    { number: 3, label: "Resultado" },
  ];

  return (
    <div className="mb-8 flex items-center justify-center gap-0">
      {steps.map((step, idx) => (
        <div key={step.number} className="flex items-center">
          <div className="flex flex-col items-center gap-1.5">
            <div
              className={[
                "flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-colors",
                currentStep === step.number
                  ? "bg-[#792990] text-white shadow-lg shadow-purple-900/40"
                  : currentStep > step.number
                  ? "bg-[#4a1660] text-purple-300"
                  : "bg-[#2d1b3d] text-gray-500",
              ].join(" ")}
            >
              {currentStep > step.number ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                step.number
              )}
            </div>
            <span
              className={[
                "text-xs font-medium",
                currentStep === step.number ? "text-purple-300" : "text-gray-500",
              ].join(" ")}
            >
              {step.label}
            </span>
          </div>
          {idx < steps.length - 1 && (
            <div
              className={[
                "mx-3 mb-5 h-px w-16 transition-colors",
                currentStep > step.number ? "bg-[#792990]" : "bg-[#2d1b3d]",
              ].join(" ")}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 1 — Upload
// ---------------------------------------------------------------------------

function UploadStep({
  onParsed,
}: {
  onParsed: (file: ParsedImportFile, fileName: string) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedFile, setParsedFile] = useState<ParsedImportFile | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    setIsLoading(true);
    setParseError(null);
    setParsedFile(null);

    try {
      const buffer = await file.arrayBuffer();
      let parsed: ParsedImportFile;

      const name = file.name.toLowerCase();
      if (name.endsWith(".csv")) {
        parsed = parseCSV(buffer);
      } else if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
        parsed = await parseXLSX(buffer);
      } else {
        throw new Error("Formato não suportado. Use .csv, .xlsx ou .xls");
      }

      if (parsed.headers.length === 0) {
        throw new Error("O arquivo parece estar vazio ou sem cabeçalhos");
      }

      setFileName(file.name);
      setParsedFile(parsed);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Erro ao ler o arquivo");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  return (
    <div className="rounded-lg bg-[#1a0022] p-8">
      <h2 className="mb-2 text-xl font-semibold text-gray-200">
        Selecione o arquivo
      </h2>
      <p className="mb-6 text-sm text-gray-400">
        Formatos suportados: CSV, Excel (.xlsx, .xls)
      </p>

      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
        className={[
          "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 text-center transition-colors outline-none",
          isDragging
            ? "border-[#792990] bg-[#2d1b3d]"
            : "border-[#4a1660] bg-[#200030] hover:border-[#792990] hover:bg-[#2d1b3d]",
          isLoading ? "pointer-events-none opacity-60" : "",
        ].join(" ")}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={handleFileChange}
        />

        {isLoading ? (
          <>
            <svg className="mb-4 h-10 w-10 animate-spin text-[#792990]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm text-gray-400">Lendo arquivo...</p>
          </>
        ) : (
          <>
            <svg className="mb-4 h-12 w-12 text-[#792990]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <p className="text-base font-medium text-gray-300">
              Arraste o arquivo aqui ou{" "}
              <span className="text-[#a855f7]">clique para selecionar</span>
            </p>
            <p className="mt-2 text-xs text-gray-500">CSV, XLSX ou XLS</p>
          </>
        )}
      </div>

      {/* Parse error */}
      {parseError && (
        <div className="mt-4 flex items-start gap-3 rounded-lg border border-red-800 bg-red-950/40 px-4 py-3">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <p className="text-sm text-red-400">{parseError}</p>
        </div>
      )}

      {/* Parsed file info */}
      {parsedFile && !parseError && (
        <div className="mt-4 flex items-center gap-4 rounded-lg border border-[#4a1660] bg-[#2d1b3d] px-5 py-4">
          <svg className="h-8 w-8 shrink-0 text-[#792990]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-sm font-medium text-gray-200">{fileName}</p>
            <p className="text-xs text-gray-400">
              {parsedFile.totalRows} linhas · {parsedFile.headers.length} colunas detectadas
            </p>
          </div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setParsedFile(null); setFileName(""); }}
            className="rounded p-1 text-gray-500 hover:text-gray-300"
            aria-label="Remover arquivo"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Next button */}
      <div className="mt-6 flex justify-end">
        <button
          type="button"
          disabled={!parsedFile}
          onClick={() => parsedFile && onParsed(parsedFile, fileName)}
          className="rounded-md bg-[#792990] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#9333b8] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Próximo
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2 — Column mapping
// ---------------------------------------------------------------------------

function MappingStep({
  parsedFile,
  mapping,
  onMappingChange,
  onBack,
  onImport,
  isImporting,
}: {
  parsedFile: ParsedImportFile;
  mapping: ColumnMapping;
  onMappingChange: (mapping: ColumnMapping) => void;
  onBack: () => void;
  onImport: () => void;
  isImporting: boolean;
}) {
  const firstRow = parsedFile.rows[0] ?? {};
  const businessNameMapped = Object.values(mapping).includes("businessName");

  const handleChange = (header: string, value: string) => {
    onMappingChange({ ...mapping, [header]: value as ColumnMapping[string] });
  };

  return (
    <div className="rounded-lg bg-[#1a0022] p-8">
      <h2 className="mb-1 text-xl font-semibold text-gray-200">
        Mapeie as colunas do arquivo para os campos do CRM
      </h2>
      <p className="mb-6 text-sm text-gray-400">
        Associe cada coluna do seu arquivo ao campo correspondente no sistema.
        Colunas não relevantes podem ser ignoradas.
      </p>

      {/* businessName warning */}
      {!businessNameMapped && (
        <div className="mb-5 flex items-start gap-3 rounded-lg border border-yellow-700 bg-yellow-950/30 px-4 py-3">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <p className="text-sm text-yellow-400">
            <span className="font-semibold">Atenção:</span> o campo{" "}
            <span className="font-mono">Nome comercial</span> é obrigatório. Mapeie uma coluna para ele antes de importar.
          </p>
        </div>
      )}

      {/* Mapping table */}
      <div className="overflow-hidden rounded-lg border border-[#4a1660]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#4a1660] bg-[#200030]">
              <th className="px-4 py-3 text-left font-medium text-gray-400">Coluna no arquivo</th>
              <th className="px-4 py-3 text-left font-medium text-gray-400">Exemplo (1ª linha)</th>
              <th className="px-4 py-3 text-left font-medium text-gray-400">Campo no CRM</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2d1b3d]">
            {parsedFile.headers.map((header) => {
              const exampleValue = firstRow[header] ?? "";
              const currentValue = mapping[header] ?? "ignore";
              const isMapped = currentValue !== "ignore";

              return (
                <tr
                  key={header}
                  className={[
                    "transition-colors",
                    isMapped ? "bg-[#1e0a2e]" : "bg-[#1a0022]",
                  ].join(" ")}
                >
                  {/* Column name */}
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-200">{header}</span>
                  </td>

                  {/* Example value */}
                  <td className="px-4 py-3 max-w-[200px]">
                    {exampleValue ? (
                      <span className="truncate block text-gray-400 font-mono text-xs">
                        {exampleValue.length > 40 ? exampleValue.slice(0, 40) + "…" : exampleValue}
                      </span>
                    ) : (
                      <span className="text-gray-600 text-xs italic">vazio</span>
                    )}
                  </td>

                  {/* Field select */}
                  <td className="px-4 py-3">
                    <select
                      value={currentValue}
                      onChange={(e) => handleChange(header, e.target.value)}
                      className="w-full rounded-md border border-[#792990] bg-[#2d1b3d] px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-[#792990]"
                    >
                      {FIELD_GROUPS.map((group) =>
                        group.name === "" ? (
                          group.fields.map((f) => (
                            <option key={f.value} value={f.value}>
                              {f.label}
                            </option>
                          ))
                        ) : (
                          <optgroup key={group.name} label={group.name}>
                            {group.fields.map((f) => (
                              <option key={f.value} value={f.value}>
                                {f.label}
                              </option>
                            ))}
                          </optgroup>
                        )
                      )}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mapped columns summary */}
      <p className="mt-3 text-xs text-gray-500">
        {Object.values(mapping).filter((v) => v !== "ignore").length} de{" "}
        {parsedFile.headers.length} colunas mapeadas
      </p>

      {/* Action buttons */}
      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          disabled={isImporting}
          className="rounded-md border border-gray-600 px-5 py-2.5 text-sm text-gray-300 transition-colors hover:bg-[#2d1b3d] disabled:opacity-40"
        >
          Voltar
        </button>
        <button
          type="button"
          onClick={onImport}
          disabled={isImporting || !businessNameMapped}
          className="inline-flex items-center gap-2 rounded-md bg-[#792990] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#9333b8] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isImporting ? (
            <>
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Importando...
            </>
          ) : (
            `Importar ${parsedFile.totalRows} leads`
          )}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 3 — Results
// ---------------------------------------------------------------------------

function ResultsStep({
  result,
  duplicateRows,
  mapping,
  onReimportDuplicates,
  isReimporting,
}: {
  result: ImportResult;
  duplicateRows: ParsedRow[];
  mapping: ColumnMapping;
  onReimportDuplicates: () => void;
  isReimporting: boolean;
}) {
  const router = useRouter();
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const summaryCards = [
    {
      label: "Criados",
      value: result.created,
      color: "text-green-400",
      bgColor: "bg-green-950/40 border-green-800",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: "Duplicatas",
      value: result.duplicates,
      color: "text-yellow-400",
      bgColor: "bg-yellow-950/40 border-yellow-800",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      ),
    },
    {
      label: "Erros",
      value: result.errors,
      color: "text-red-400",
      bgColor: "bg-red-950/40 border-red-800",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: "Ignorados",
      value: result.skipped,
      color: "text-gray-400",
      bgColor: "bg-[#2d1b3d] border-[#4a1660]",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h14.25M3 9h9.75M3 13.5h9.75m4.5-4.5v12m0 0l-3.75-3.75M17.25 21L21 17.25" />
        </svg>
      ),
    },
  ];

  // Helper: format duplicate match categories
  function formatMatchCategories(matches: DuplicateDetail["matches"]): string {
    const cats: string[] = [];
    if (matches.cnpj?.length) cats.push("CNPJ");
    if (matches.name?.length) cats.push("Nome");
    if (matches.phone?.length) cats.push("Telefone");
    if (matches.email?.length) cats.push("E-mail");
    if (matches.address?.length) cats.push("Endereço");
    return cats.join(", ");
  }

  // Get all unique existing leads from matches
  function getMatchedLeads(matches: DuplicateDetail["matches"]) {
    const seen = new Set<string>();
    const leads: { id: string; businessName: string }[] = [];
    for (const arr of [matches.cnpj, matches.name, matches.phone, matches.email, matches.address]) {
      for (const lead of arr ?? []) {
        if (!seen.has(lead.id)) {
          seen.add(lead.id);
          leads.push({ id: lead.id, businessName: lead.businessName });
        }
      }
    }
    return leads;
  }

  // Get display value from row using mapping
  function getDisplayValue(row: ParsedRow, field: string): string {
    const col = Object.entries(mapping).find(([, v]) => v === field)?.[0];
    return col ? row[col] ?? "" : "";
  }

  return (
    <div className="rounded-lg bg-[#1a0022] p-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#4a1660]">
          <svg className="h-5 w-5 text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-200">Importação concluída</h2>
          <p className="text-sm text-gray-400">{result.total} linhas processadas no total</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {summaryCards.map((card) => (
          <div key={card.label} className={`rounded-lg border px-5 py-4 ${card.bgColor}`}>
            <div className={`mb-1 ${card.color}`}>{card.icon}</div>
            <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
            <p className="text-xs text-gray-400">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Duplicates section */}
      {result.duplicates > 0 && (
        <div className="mb-4 overflow-hidden rounded-lg border border-yellow-800">
          <button
            type="button"
            onClick={() => setShowDuplicates((v) => !v)}
            className="flex w-full items-center justify-between bg-yellow-950/30 px-5 py-3 text-left transition-colors hover:bg-yellow-950/50"
          >
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <span className="text-sm font-medium text-yellow-400">
                {result.duplicates} {result.duplicates === 1 ? "duplicata encontrada" : "duplicatas encontradas"}
              </span>
            </div>
            <svg
              className={`h-4 w-4 text-yellow-400 transition-transform ${showDuplicates ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>

          {showDuplicates && (
            <div className="divide-y divide-[#2d1b3d] bg-[#1a0022]">
              {result.duplicateDetails.map((dup, idx) => {
                const name = getDisplayValue(dup.row, "businessName");
                const matchedLeads = getMatchedLeads(dup.matches);
                const categories = formatMatchCategories(dup.matches);

                return (
                  <div key={idx} className="px-5 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-gray-200">
                          Linha {dup.rowIndex + 2}: {name || <span className="text-gray-500 italic">sem nome</span>}
                        </p>
                        {categories && (
                          <p className="mt-0.5 text-xs text-yellow-500">
                            Coincidência por: <span className="font-medium">{categories}</span>
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {matchedLeads.map((lead) => (
                          <a
                            key={lead.id}
                            href={`/leads/${lead.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-md border border-[#4a1660] bg-[#2d1b3d] px-2.5 py-1 text-xs text-purple-300 transition-colors hover:bg-[#3d2a50]"
                          >
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                            </svg>
                            {lead.businessName}
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Errors section */}
      {result.errors > 0 && (
        <div className="mb-4 overflow-hidden rounded-lg border border-red-800">
          <button
            type="button"
            onClick={() => setShowErrors((v) => !v)}
            className="flex w-full items-center justify-between bg-red-950/30 px-5 py-3 text-left transition-colors hover:bg-red-950/50"
          >
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium text-red-400">
                {result.errors} {result.errors === 1 ? "erro" : "erros"} ao importar
              </span>
            </div>
            <svg
              className={`h-4 w-4 text-red-400 transition-transform ${showErrors ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>

          {showErrors && (
            <div className="divide-y divide-[#2d1b3d] bg-[#1a0022]">
              {result.errorDetails.map((err, idx) => {
                const name = getDisplayValue(err.row, "businessName");
                return (
                  <div key={idx} className="px-5 py-3">
                    <p className="text-sm font-medium text-gray-200">
                      Linha {err.rowIndex + 2}: {name || <span className="text-gray-500 italic">sem nome</span>}
                    </p>
                    <p className="mt-0.5 text-xs text-red-400">{err.message}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => router.push("/leads")}
          className="rounded-md bg-[#792990] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#9333b8]"
        >
          Ver todos os leads
        </button>

        {result.duplicates > 0 && (
          <button
            type="button"
            onClick={onReimportDuplicates}
            disabled={isReimporting || duplicateRows.length === 0}
            className="inline-flex items-center gap-2 rounded-md border border-yellow-700 bg-yellow-950/30 px-5 py-2.5 text-sm font-semibold text-yellow-400 transition-colors hover:bg-yellow-950/60 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isReimporting ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Importando duplicatas...
              </>
            ) : (
              `Importar ${result.duplicates} ${result.duplicates === 1 ? "duplicata" : "duplicatas"} mesmo assim`
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main wizard
// ---------------------------------------------------------------------------

export function ImportWizard() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const [step, setStep] = useState<Step>(1);
  const [parsedFile, setParsedFile] = useState<ParsedImportFile | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isReimporting, setIsReimporting] = useState(false);
  // Keep duplicate rows around for re-import
  const [duplicateRows, setDuplicateRows] = useState<ParsedRow[]>([]);

  // Inline import orchestration (replaces importLeads server action)
  const runImport = useCallback(async (rows: ParsedRow[], currentMapping: ColumnMapping, skipDuplicateCheck = false): Promise<ImportResult> => {
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
      const leadData = mapRowToLeadData(row, currentMapping);

      const hasContent = Object.values(leadData).some(
        (v) => v !== undefined && v !== null && String(v).trim() !== ""
      );
      if (!hasContent) {
        result.skipped++;
        continue;
      }

      if (!leadData.businessName) {
        result.errors++;
        result.errorDetails.push({ rowIndex: i, row, message: "Nome comercial (businessName) é obrigatório" });
        continue;
      }

      try {
        if (!skipDuplicateCheck) {
          const { hasDuplicates, duplicates } = await apiFetch<{ hasDuplicates: boolean; duplicates: Array<{ leadId: string; businessName: string; matchedFields: string[] }> }>(
            "/leads/check-duplicates",
            token,
            {
              method: "POST",
              body: JSON.stringify({ name: leadData.businessName, cnpj: leadData.companyRegistrationID, phone: leadData.phone, email: leadData.email }),
            },
          );
          if (hasDuplicates) {
            const matches: LeadDuplicates = { cnpj: [], name: [], phone: [], email: [], address: [] };
            for (const match of duplicates) {
              const item = { id: match.leadId, businessName: match.businessName };
              for (const field of match.matchedFields) {
                if (field in matches) matches[field as keyof LeadDuplicates].push(item);
              }
            }
            result.duplicates++;
            result.duplicateDetails.push({ rowIndex: i, row, matches });
            continue;
          }
        }

        await apiFetch("/leads", token, {
          method: "POST",
          body: JSON.stringify(leadData),
        });
        result.created++;
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
  }, [token]);

  // Step 1 → 2
  const handleParsed = useCallback((file: ParsedImportFile) => {
    setParsedFile(file);
    setMapping(buildInitialMapping(file.headers));
    setStep(2);
  }, []);

  // Step 2: Run import
  const handleImport = useCallback(async () => {
    if (!parsedFile) return;
    setIsImporting(true);

    try {
      const result = await runImport(parsedFile.rows, mapping);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      // Save duplicate rows for potential re-import
      setDuplicateRows(result.duplicateDetails.map((d) => d.row));
      setImportResult(result);
      setStep(3);

      if (result.created > 0) {
        toast.success(
          `${result.created} ${result.created === 1 ? "lead importado" : "leads importados"} com sucesso`
        );
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erro inesperado ao importar"
      );
    } finally {
      setIsImporting(false);
    }
  }, [parsedFile, mapping, runImport]);

  // Step 3: Re-import duplicates
  const handleReimportDuplicates = useCallback(async () => {
    if (duplicateRows.length === 0) return;
    setIsReimporting(true);

    try {
      const result = await runImport(duplicateRows, mapping, true);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      // Merge results with previous import
      setImportResult((prev) => {
        if (!prev) return result;
        return {
          total: prev.total,
          created: prev.created + result.created,
          duplicates: result.duplicates,
          errors: prev.errors + result.errors,
          skipped: prev.skipped + result.skipped,
          duplicateDetails: result.duplicateDetails,
          errorDetails: [...prev.errorDetails, ...result.errorDetails],
        };
      });

      // Update remaining duplicates for another potential re-import
      setDuplicateRows(result.duplicateDetails.map((d) => d.row));

      if (result.created > 0) {
        toast.success(
          `${result.created} ${result.created === 1 ? "duplicata importada" : "duplicatas importadas"} com sucesso`
        );
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erro ao reimportar duplicatas"
      );
    } finally {
      setIsReimporting(false);
    }
  }, [duplicateRows, mapping, runImport]);

  return (
    <div className="mx-auto max-w-4xl">
      <StepIndicator currentStep={step} />

      {step === 1 && (
        <UploadStep onParsed={handleParsed} />
      )}

      {step === 2 && parsedFile && (
        <MappingStep
          parsedFile={parsedFile}
          mapping={mapping}
          onMappingChange={setMapping}
          onBack={() => setStep(1)}
          onImport={handleImport}
          isImporting={isImporting}
        />
      )}

      {step === 3 && importResult && (
        <ResultsStep
          result={importResult}
          duplicateRows={duplicateRows}
          mapping={mapping}
          onReimportDuplicates={handleReimportDuplicates}
          isReimporting={isReimporting}
        />
      )}
    </div>
  );
}
