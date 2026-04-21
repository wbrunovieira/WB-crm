"use client";

import { useState, useEffect } from "react";
import { Plus, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api-client";
import { DEFAULT_DIGITAL_PRESENCE_OPTIONS, type DigitalPresenceCategory } from "@/lib/lists/digital-presence-options";
import { toast } from "sonner";

interface PresenceSelectFieldProps {
  label: string;
  name: string;
  category: DigitalPresenceCategory;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function PresenceSelectField({
  label,
  name,
  category,
  value,
  onChange,
  className = "",
}: PresenceSelectFieldProps) {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const [options, setOptions] = useState<{ value: string; label: string }[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newOption, setNewOption] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadOptions() {
    const custom = await apiFetch<Array<{ name: string }>>(
      `/leads/dropdown-options?category=${encodeURIComponent(category)}`,
      token,
    ).catch(() => []);
    const defaultValues = DEFAULT_DIGITAL_PRESENCE_OPTIONS.map((o) => o.value as string);
    const filteredCustom = custom
      .filter((c) => !defaultValues.includes(c.name))
      .map((c) => ({ value: c.name, label: c.name }));
    setOptions([...DEFAULT_DIGITAL_PRESENCE_OPTIONS, ...filteredCustom]);
  }

  useEffect(() => {
    if (token) loadOptions();
  }, [category, token]);

  async function handleAdd() {
    const trimmed = newOption.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      await apiFetch("/leads/dropdown-options", token, {
        method: "POST",
        body: JSON.stringify({ name: trimmed, category }),
      });
      await loadOptions();
      onChange(trimmed);
      setNewOption("");
      setShowAdd(false);
      toast.success("Opção cadastrada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao cadastrar opção");
    }
    setSaving(false);
  }

  const inputClass =
    "mt-1 block w-full rounded-md border border-[#792990] bg-[#2d1b3d] px-3 py-2 text-gray-200 focus:border-[#792990] focus:outline-none focus:ring-1 focus:ring-[#792990]";

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-300">{label}</label>
      <select
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      >
        <option value="">— Selecionar —</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {!showAdd ? (
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="mt-1.5 flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300"
        >
          <Plus className="h-3 w-3" />
          Adicionar opção
        </button>
      ) : (
        <div className="mt-1.5 flex gap-2">
          <input
            type="text"
            value={newOption}
            onChange={(e) => setNewOption(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); handleAdd(); }
              if (e.key === "Escape") { setShowAdd(false); setNewOption(""); }
            }}
            placeholder="Nova opção..."
            autoFocus
            disabled={saving}
            className="flex-1 rounded-md border border-[#792990] bg-[#2d1b3d] px-2 py-1 text-xs text-gray-200 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={!newOption.trim() || saving}
            className="inline-flex items-center gap-1 rounded-md bg-purple-700 px-2 py-1 text-xs text-white hover:bg-purple-600 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Salvar"}
          </button>
          <button
            type="button"
            onClick={() => { setShowAdd(false); setNewOption(""); }}
            className="rounded-md px-2 py-1 text-xs text-gray-400 hover:text-gray-200"
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}
