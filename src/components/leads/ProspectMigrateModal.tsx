"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { X, ArrowRight, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api-client";

interface ProspectDetail {
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  zipCode: string | null;
  phone: string | null;
  website: string | null;
  description: string | null;
  businessStatus: string | null;
}

interface Props {
  prospectId: string;
  targetLeadId: string;
  targetLeadName: string;
  onDone: () => void;
  onCancel: () => void;
}

const FIELD_META: Array<{ key: keyof ProspectDetail; label: string }> = [
  { key: "address",        label: "Endereço completo" },
  { key: "city",           label: "Cidade" },
  { key: "state",          label: "Estado" },
  { key: "country",        label: "País" },
  { key: "zipCode",        label: "CEP" },
  { key: "phone",          label: "Telefone" },
  { key: "website",        label: "Website" },
  { key: "description",    label: "Descrição" },
  { key: "businessStatus", label: "Status do negócio" },
];

export function ProspectMigrateModal({ prospectId, targetLeadId, targetLeadName, onDone, onCancel }: Props) {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";

  const [detail, setDetail] = useState<ProspectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Set<keyof ProspectDetail>>(new Set());

  useEffect(() => {
    apiFetch<ProspectDetail>(`/leads/${prospectId}`, token)
      .then((data) => {
        setDetail(data);
        // Pre-select all non-empty fields
        const pre = new Set<keyof ProspectDetail>();
        for (const { key } of FIELD_META) {
          if (data[key]) pre.add(key);
        }
        setSelected(pre);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar"))
      .finally(() => setLoading(false));
  }, [prospectId, token]);

  function toggle(key: keyof ProspectDetail) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleConfirm() {
    if (!detail || selected.size === 0) return;
    setSaving(true);
    setError("");
    try {
      const payload: Record<string, unknown> = {};
      for (const { key } of FIELD_META) {
        if (selected.has(key) && detail[key] != null) payload[key] = detail[key];
      }
      // Patch the existing lead with selected fields
      await apiFetch(`/leads/${targetLeadId}`, token, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      // Archive the prospect (discard)
      await apiFetch(`/leads/${prospectId}/archive`, token, {
        method: "PATCH",
        body: JSON.stringify({ reason: "descartado" }),
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao migrar");
      setSaving(false);
    }
  }

  const availableFields = FIELD_META.filter((f) => detail?.[f.key]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Migrar dados do prospecto</h2>
            <p className="mt-0.5 text-xs text-gray-500">
              Destino: <span className="font-medium text-gray-700">{targetLeadName}</span>
            </p>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          {loading && (
            <div className="py-6 text-center text-sm text-gray-400 flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando campos...
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          {detail && (
            <>
              <p className="text-sm text-gray-600">
                Selecione os campos do Google que deseja copiar para o lead existente.
                O prospecto será descartado após a migração.
              </p>

              {availableFields.length === 0 ? (
                <p className="text-sm text-gray-400 italic">Nenhum campo com valor disponível para migração.</p>
              ) : (
                <ul className="space-y-2">
                  {availableFields.map(({ key, label }) => (
                    <li key={key}>
                      <label className="flex items-start gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={selected.has(key)}
                          onChange={() => toggle(key)}
                          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
                          <p className="text-sm text-gray-800 truncate">{String(detail[key])}</p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-purple-400 mt-1 shrink-0 transition-colors" />
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>

        <div className="flex gap-3 border-t border-gray-100 px-6 py-4">
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving || selected.size === 0 || !detail}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {saving ? "Migrando..." : `Migrar ${selected.size} campo${selected.size !== 1 ? "s" : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}
