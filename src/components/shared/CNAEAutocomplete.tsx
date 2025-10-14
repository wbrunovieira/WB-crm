"use client";

import { useState, useEffect, useRef } from "react";
import { searchCNAEs } from "@/actions/cnaes";
import { Search, X } from "lucide-react";

interface CNAE {
  id: string;
  code: string;
  description: string;
}

interface CNAEAutocompleteProps {
  value?: CNAE | null;
  onChange: (cnae: CNAE | null) => void;
  placeholder?: string;
  label?: string;
  error?: string;
}

export function CNAEAutocomplete({
  value,
  onChange,
  placeholder = "Digite para buscar CNAE...",
  label,
  error,
}: CNAEAutocompleteProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CNAE[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Search CNAEs
  useEffect(() => {
    const searchTimer = setTimeout(async () => {
      if (query.length >= 2) {
        setLoading(true);
        try {
          const cnaes = await searchCNAEs(query);
          setResults(cnaes);
          setIsOpen(true);
        } catch (error) {
          console.error("Error searching CNAEs:", error);
        } finally {
          setLoading(false);
        }
      } else {
        setResults([]);
        setIsOpen(false);
      }
    }, 300);

    return () => clearTimeout(searchTimer);
  }, [query]);

  const handleSelect = (cnae: CNAE) => {
    onChange(cnae);
    setQuery("");
    setResults([]);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange(null);
    setQuery("");
    setResults([]);
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}

      {value ? (
        <div className="flex items-center justify-between rounded-md border border-gray-300 bg-gray-50 px-3 py-2">
          <div className="flex-1">
            <span className="font-mono text-sm text-gray-600">{value.code}</span>
            <span className="ml-2 text-sm text-gray-900">{value.description}</span>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="ml-2 text-gray-400 hover:text-red-600"
            title="Remover"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div ref={wrapperRef} className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              className="w-full rounded-md border border-gray-300 py-2 pl-10 pr-3 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {isOpen && (
            <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg">
              {loading ? (
                <div className="px-3 py-2 text-sm text-gray-500">Buscando...</div>
              ) : results.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-500">
                  Nenhum CNAE encontrado
                </div>
              ) : (
                results.map((cnae) => (
                  <button
                    key={cnae.id}
                    type="button"
                    onClick={() => handleSelect(cnae)}
                    className="w-full px-3 py-2 text-left hover:bg-gray-100"
                  >
                    <div className="font-mono text-sm text-gray-600">{cnae.code}</div>
                    <div className="text-sm text-gray-900">{cnae.description}</div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {!value && !isOpen && (
        <p className="text-xs text-gray-500">
          Para empresas internacionais, use o campo "Atividade Internacional" abaixo
        </p>
      )}
    </div>
  );
}
