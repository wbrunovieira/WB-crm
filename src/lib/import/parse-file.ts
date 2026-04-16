/**
 * parse-file.ts
 *
 * Parser de arquivos de importação de leads.
 * Suporta CSV (vírgula ou ponto-e-vírgula) e XLSX.
 * Roda tanto no browser (client component) quanto no servidor.
 */

export type ParsedRow = Record<string, string>;

export interface ParsedImportFile {
  /** Cabeçalhos detectados na primeira linha */
  headers: string[];
  /** Todas as linhas como key-value usando os cabeçalhos */
  rows: ParsedRow[];
  /** Total de linhas de dados (excluindo cabeçalho e linhas vazias) */
  totalRows: number;
}

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------

/**
 * Parseia um ArrayBuffer de arquivo CSV.
 * Auto-detecta separador (vírgula ou ponto-e-vírgula).
 * Remove BOM UTF-8 se presente.
 */
export function parseCSV(buffer: ArrayBuffer): ParsedImportFile {
  const text = decodeBuffer(buffer);
  const lines = splitLines(text);

  if (lines.length === 0) {
    return { headers: [], rows: [], totalRows: 0 };
  }

  // Detecta separador pela primeira linha
  const sep = detectSeparator(lines[0]);

  const headers = parseCSVLine(lines[0], sep).map((h) => h.trim());
  const rows: ParsedRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // ignora linhas vazias

    const values = parseCSVLine(line, sep);
    const row: ParsedRow = {};
    headers.forEach((header, idx) => {
      row[header] = (values[idx] ?? "").trim();
    });
    rows.push(row);
  }

  return { headers, rows, totalRows: rows.length };
}

// ---------------------------------------------------------------------------
// XLSX — wrapper fino sobre a lib 'xlsx'
// ---------------------------------------------------------------------------

/**
 * Parseia um ArrayBuffer de arquivo XLSX (ou XLS).
 * Usa a lib 'xlsx' (SheetJS) — deve ser importada dinamicamente no browser.
 */
export async function parseXLSX(buffer: ArrayBuffer): Promise<ParsedImportFile> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(buffer, { type: "array" });

  // Usa a primeira aba
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Converte para array de arrays
  const raw: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

  if (raw.length === 0) {
    return { headers: [], rows: [], totalRows: 0 };
  }

  const headers = (raw[0] as unknown[]).map((h) => String(h).trim());
  const rows: ParsedRow[] = [];

  for (let i = 1; i < raw.length; i++) {
    const rawRow = raw[i] as unknown[];
    // Ignora linhas onde todos os valores são vazios
    if (rawRow.every((v) => String(v).trim() === "")) continue;

    const row: ParsedRow = {};
    headers.forEach((header, idx) => {
      row[header] = String(rawRow[idx] ?? "").trim();
    });
    rows.push(row);
  }

  return { headers, rows, totalRows: rows.length };
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function decodeBuffer(buffer: ArrayBuffer): string {
  const decoder = new TextDecoder("utf-8");
  let text = decoder.decode(buffer);
  // Remove BOM UTF-8
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }
  return text;
}

function splitLines(text: string): string[] {
  return text.split(/\r?\n/);
}

function detectSeparator(firstLine: string): string {
  const commaCount = (firstLine.match(/,/g) ?? []).length;
  const semicolonCount = (firstLine.match(/;/g) ?? []).length;
  return semicolonCount > commaCount ? ";" : ",";
}

/**
 * Parseia uma linha CSV respeitando valores entre aspas com separadores internos.
 */
function parseCSVLine(line: string, sep: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      // aspas duplas dentro de campo entre aspas → literal "
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === sep && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}
