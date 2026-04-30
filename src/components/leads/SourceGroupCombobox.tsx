"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Plus } from "lucide-react";

interface SourceGroupComboboxProps {
  name: string;
  defaultValue?: string;
  groups: string[];
}

export function SourceGroupCombobox({ name, defaultValue = "", groups }: SourceGroupComboboxProps) {
  const [value, setValue] = useState(defaultValue);
  const [query, setQuery] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = query
    ? groups.filter((g) => g.toLowerCase().includes(query.toLowerCase()))
    : groups;

  const isNew = query.trim() && !groups.some((g) => g.toLowerCase() === query.trim().toLowerCase());

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function select(group: string) {
    setValue(group);
    setQuery(group);
    setOpen(false);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value);
    setValue(e.target.value);
    setOpen(true);
  }

  return (
    <div ref={containerRef} className="relative mt-1">
      {/* hidden field that submits the value */}
      <input type="hidden" name={name} value={value} />

      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setOpen(true)}
          placeholder="Selecione ou digite um novo grupo..."
          className="block w-full rounded-md border border-[#792990] bg-[#2d1b3d] px-3 py-2 pr-9 text-gray-200 placeholder-gray-500 focus:border-[#792990] focus:outline-none focus:ring-1 focus:ring-[#792990]"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setOpen((o) => !o)}
          className="absolute inset-y-0 right-0 flex items-center px-2 text-gray-400 hover:text-gray-200"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>

      {open && (filtered.length > 0 || isNew) && (
        <ul className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-md border border-[#792990] bg-[#1a0022] py-1 shadow-xl">
          {filtered.map((g) => (
            <li
              key={g}
              onMouseDown={(e) => { e.preventDefault(); select(g); }}
              className={`flex cursor-pointer items-center px-3 py-2 text-sm text-gray-200 hover:bg-[#792990] hover:text-white ${
                g === value ? "bg-[#2d1b3d] font-medium" : ""
              }`}
            >
              {g}
            </li>
          ))}
          {isNew && (
            <li
              onMouseDown={(e) => { e.preventDefault(); select(query.trim()); }}
              className="flex cursor-pointer items-center gap-2 border-t border-[#792990]/40 px-3 py-2 text-sm text-purple-300 hover:bg-[#792990] hover:text-white"
            >
              <Plus className="h-3.5 w-3.5" />
              Criar &ldquo;{query.trim()}&rdquo;
            </li>
          )}
        </ul>
      )}

      {groups.length > 0 && !open && (
        <p className="mt-1 text-xs text-gray-500">
          {groups.length} grupo{groups.length !== 1 ? "s" : ""} existente{groups.length !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
