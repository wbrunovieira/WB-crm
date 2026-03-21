"use client";

import { useState } from "react";
import { Globe, X, Star } from "lucide-react";

export type LanguageEntry = {
  code: string;
  isPrimary: boolean;
};

const SUPPORTED_LANGUAGES = [
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

export function getLanguageLabel(code: string): string {
  const lang = SUPPORTED_LANGUAGES.find((l) => l.code === code);
  return lang?.label || code;
}

export function LanguageBadge({ code, isPrimary }: { code: string; isPrimary?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-800">
      <Globe className="h-3 w-3" />
      {getLanguageLabel(code)}
      {isPrimary && <Star className="h-3 w-3 fill-indigo-600 text-indigo-600" />}
    </span>
  );
}

export function LanguageBadges({ languages }: { languages: string | null }) {
  if (!languages) {
    return (
      <span className="text-xs text-gray-400 italic">Sem idioma cadastrado</span>
    );
  }

  try {
    const parsed: LanguageEntry[] = JSON.parse(languages);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return (
        <span className="text-xs text-gray-400 italic">Sem idioma cadastrado</span>
      );
    }
    return (
      <div className="flex flex-wrap gap-1">
        {parsed.map((lang) => (
          <LanguageBadge key={lang.code} code={lang.code} isPrimary={lang.isPrimary} />
        ))}
      </div>
    );
  } catch {
    return (
      <span className="text-xs text-gray-400 italic">Sem idioma cadastrado</span>
    );
  }
}

type LanguageSelectorProps = {
  value: LanguageEntry[];
  onChange: (languages: LanguageEntry[]) => void;
  darkMode?: boolean;
};

export function LanguageSelector({ value, onChange, darkMode = false }: LanguageSelectorProps) {
  const [showDropdown, setShowDropdown] = useState(false);

  const availableLanguages = SUPPORTED_LANGUAGES.filter(
    (lang) => !value.some((v) => v.code === lang.code)
  );

  const addLanguage = (code: string) => {
    const isFirst = value.length === 0;
    onChange([...value, { code, isPrimary: isFirst }]);
    setShowDropdown(false);
  };

  const removeLanguage = (code: string) => {
    const filtered = value.filter((l) => l.code !== code);
    // If removed the primary and others remain, make first one primary
    if (filtered.length > 0 && !filtered.some((l) => l.isPrimary)) {
      filtered[0].isPrimary = true;
    }
    onChange(filtered);
  };

  const setPrimary = (code: string) => {
    onChange(
      value.map((l) => ({
        ...l,
        isPrimary: l.code === code,
      }))
    );
  };

  const inputClass = darkMode
    ? "block w-full rounded-md border border-[#792990] bg-[#2d1b3d] px-3 py-2 text-gray-200 focus:border-[#792990] focus:outline-none focus:ring-1 focus:ring-[#792990] cursor-pointer"
    : "block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary cursor-pointer";

  const badgeBg = darkMode ? "bg-indigo-900 text-indigo-200" : "bg-indigo-100 text-indigo-800";
  const primaryBtnClass = darkMode
    ? "text-yellow-400 hover:text-yellow-300"
    : "text-yellow-500 hover:text-yellow-600";
  const nonPrimaryBtnClass = darkMode
    ? "text-gray-500 hover:text-yellow-400"
    : "text-gray-400 hover:text-yellow-500";

  return (
    <div>
      <label className={`block text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"} mb-1`}>
        Idiomas
      </label>

      {/* Selected languages */}
      {value.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {value.map((lang) => (
            <span
              key={lang.code}
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${badgeBg}`}
            >
              <Globe className="h-3 w-3" />
              {getLanguageLabel(lang.code)}
              {value.length > 1 && (
                <button
                  type="button"
                  onClick={() => setPrimary(lang.code)}
                  className={lang.isPrimary ? primaryBtnClass : nonPrimaryBtnClass}
                  title={lang.isPrimary ? "Idioma principal" : "Definir como principal"}
                >
                  <Star className={`h-3 w-3 ${lang.isPrimary ? "fill-current" : ""}`} />
                </button>
              )}
              <button
                type="button"
                onClick={() => removeLanguage(lang.code)}
                className={darkMode ? "text-red-400 hover:text-red-300 ml-1" : "text-red-500 hover:text-red-700 ml-1"}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Add language dropdown */}
      {availableLanguages.length > 0 && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowDropdown(!showDropdown)}
            className={inputClass}
          >
            <span className={darkMode ? "text-gray-400" : "text-gray-500"}>
              + Adicionar idioma
            </span>
          </button>

          {showDropdown && (
            <div className={`absolute z-10 mt-1 w-full rounded-md shadow-lg max-h-48 overflow-y-auto ${
              darkMode ? "bg-[#2d1b3d] border border-[#792990]" : "bg-white border border-gray-300"
            }`}>
              {availableLanguages.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => addLanguage(lang.code)}
                  className={`w-full text-left px-4 py-2 text-sm ${
                    darkMode
                      ? "text-gray-200 hover:bg-[#792990]/30"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {value.length > 1 && (
        <p className={`mt-1 text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
          ★ = idioma principal. Clique na estrela para alterar.
        </p>
      )}
    </div>
  );
}
