"use client";

import { GMAIL_VARIABLES } from "@/lib/gmail-variables";
import { ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface GmailVariablePickerProps {
  onInsert: (variable: string) => void;
  label?: string;
}

export function GmailVariablePicker({
  onInsert,
  label = "Inserir variável",
}: GmailVariablePickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 rounded border border-dashed border-blue-400 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors"
      >
        {label}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-72 rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="border-b px-3 py-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Variáveis disponíveis
            </p>
          </div>
          <ul className="py-1">
            {GMAIL_VARIABLES.map((v) => (
              <li key={v.key}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault(); // não rouba o foco do editor/input
                    onInsert(v.key);
                    setOpen(false);
                  }}
                  className="flex w-full items-start gap-3 px-3 py-2 text-left hover:bg-gray-50 transition-colors"
                >
                  <code className="mt-0.5 shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono text-blue-700">
                    {v.key}
                  </code>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-gray-800">{v.label}</span>
                    <span className="block text-xs text-gray-500">{v.description}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <div className="border-t px-3 py-2">
            <p className="text-xs text-gray-400">
              As variáveis são substituídas automaticamente ao enviar o e-mail.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
