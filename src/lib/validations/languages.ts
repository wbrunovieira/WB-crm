import { z } from "zod";

export const SUPPORTED_LANGUAGES = [
  { code: "pt-BR", label: "Português (BR)" },
  { code: "pt-PT", label: "Português (PT)" },
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "it", label: "Italiano" },
  { code: "zh", label: "中文" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
] as const;

export const languageCodes = SUPPORTED_LANGUAGES.map((l) => l.code);

export const languageEntrySchema = z.object({
  code: z.string().refine((val) => languageCodes.includes(val as never), {
    message: "Código de idioma inválido",
  }),
  isPrimary: z.boolean(),
});

export type LanguageEntry = z.infer<typeof languageEntrySchema>;

/**
 * Validates an array of language entries.
 * - Returns null if empty/null/undefined
 * - Single language is auto-set as primary
 * - Multiple languages must have exactly one primary
 * - No duplicate codes allowed
 */
export function validateLanguages(
  languages: LanguageEntry[] | null | undefined
): LanguageEntry[] | null {
  if (!languages || languages.length === 0) {
    return null;
  }

  // Validate each entry
  languages.forEach((entry) => languageEntrySchema.parse(entry));

  // Check for duplicates
  const codes = languages.map((l) => l.code);
  if (new Set(codes).size !== codes.length) {
    throw new Error("Idiomas duplicados não são permitidos");
  }

  // Single language: auto-primary
  if (languages.length === 1) {
    return [{ ...languages[0], isPrimary: true }];
  }

  // Multiple languages: exactly one primary
  const primaries = languages.filter((l) => l.isPrimary);
  if (primaries.length === 0) {
    throw new Error("Um idioma deve ser marcado como principal");
  }
  if (primaries.length > 1) {
    throw new Error("Apenas um idioma pode ser o principal");
  }

  return languages;
}

/**
 * Parses a JSON string of languages from the database.
 */
export function parseLanguages(json: string | null | undefined): LanguageEntry[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

/**
 * Gets the label for a language code.
 */
export function getLanguageLabel(code: string): string {
  const lang = SUPPORTED_LANGUAGES.find((l) => l.code === code);
  return lang?.label || code;
}

/**
 * Gets the primary language label from a JSON string.
 */
export function getPrimaryLanguageLabel(json: string | null | undefined): string | null {
  const languages = parseLanguages(json);
  if (languages.length === 0) return null;
  const primary = languages.find((l) => l.isPrimary) || languages[0];
  return getLanguageLabel(primary.code);
}

/**
 * Converts languages array to JSON string for database storage.
 */
export function languagesToJson(
  languages: LanguageEntry[] | null | undefined
): string | null {
  const validated = validateLanguages(languages);
  if (!validated) return null;
  return JSON.stringify(validated);
}
