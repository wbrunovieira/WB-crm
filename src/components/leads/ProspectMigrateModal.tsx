"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { X, Loader2, ArrowRight } from "lucide-react";
import { apiFetch, BACKEND_URL } from "@/lib/api-client";
import { MultiLabelSelect } from "@/components/shared/MultiLabelSelect";

// Fields fetchable from both prospect and lead
interface LeadData {
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  zipCode: string | null;
  phone: string | null;
  website: string | null;
  description: string | null;
  businessStatus: string | null;
  rating: number | null;
  userRatingsTotal: number | null;
  latitude: number | null;
  longitude: number | null;
  googleMapsUrl: string | null;
  searchTerm: string | null;
  categories: string | null;
  sourceGroup: string | null;
  // Labels on the existing lead
  labels?: Array<{ id: string; name: string; color: string }>;
}

interface Props {
  prospectId: string;
  targetLeadId: string;
  targetLeadName: string;
  onDone: () => void;
  onCancel: () => void;
}

type FieldKey = keyof Omit<LeadData, "labels">;

const FIELD_META: Array<{ key: FieldKey; label: string; format?: (v: unknown) => string }> = [
  { key: "address",          label: "Endereço" },
  { key: "city",             label: "Cidade" },
  { key: "state",            label: "Estado" },
  { key: "country",          label: "País" },
  { key: "zipCode",          label: "CEP" },
  { key: "phone",            label: "Telefone" },
  { key: "website",          label: "Website" },
  { key: "description",      label: "Descrição" },
  { key: "businessStatus",   label: "Status do negócio" },
  { key: "rating",           label: "Avaliação Google", format: (v) => `${v} ★` },
  { key: "userRatingsTotal", label: "Nº de avaliações", format: (v) => `${v} avaliações` },
  { key: "latitude",         label: "Latitude" },
  { key: "longitude",        label: "Longitude" },
  { key: "googleMapsUrl",    label: "URL Google Maps" },
  { key: "searchTerm",       label: "Termo de busca" },
  { key: "categories",       label: "Categorias" },
  { key: "sourceGroup",      label: "Lote (sourceGroup)" },
];

function fmt(v: unknown, format?: (v: unknown) => string): string {
  if (v == null) return "—";
  if (format) return format(v);
  return String(v);
}

export function ProspectMigrateModal({ prospectId, targetLeadId, targetLeadName, onDone, onCancel }: Props) {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";

  const [prospect, setProspect] = useState<LeadData | null>(null);
  const [currentLead, setCurrentLead] = useState<LeadData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Set<FieldKey>>(new Set());
  const [labelIds, setLabelIds] = useState<string[]>([]);
  const [sourceGroup, setSourceGroup] = useState("");
  const [sourceGroups, setSourceGroups] = useState<string[]>([]);
  const [sgOpen, setSgOpen] = useState(false);
  const sgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${BACKEND_URL}/email/verify/source-groups`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => setSourceGroups(d.sourceGroups ?? []))
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (sgRef.current && !sgRef.current.contains(e.target as Node)) setSgOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    Promise.all([
      apiFetch<LeadData>(`/leads/${prospectId}`, token),
      apiFetch<LeadData>(`/leads/${targetLeadId}`, token),
    ])
      .then(([p, l]) => {
        setProspect(p);
        setCurrentLead(l);
        setSourceGroup(l.sourceGroup ?? "");
        // Pre-select fields where prospect has a value and lead doesn't (or prospect is clearly better)
        const pre = new Set<FieldKey>();
        for (const { key } of FIELD_META) {
          if (p[key] != null && !l[key]) pre.add(key);
        }
        setSelected(pre);
        // Pre-load existing labels
        setLabelIds((l.labels ?? []).map((lb) => lb.id));
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar"))
      .finally(() => setLoading(false));
  }, [prospectId, targetLeadId, token]);

  function toggle(key: FieldKey) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleConfirm() {
    if (!prospect) return;
    setSaving(true);
    setError("");
    try {
      const payload: Record<string, unknown> = { labelIds };
      if (sourceGroup.trim()) payload.sourceGroup = sourceGroup.trim();
      for (const { key } of FIELD_META) {
        if (selected.has(key) && prospect[key] != null) payload[key] = prospect[key];
      }
      await apiFetch(`/leads/${targetLeadId}`, token, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
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

  // Fields where prospect has a value
  const availableFields = FIELD_META.filter((f) => prospect?.[f.key] != null);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-xl bg-white shadow-2xl flex flex-col">

        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4 z-10">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Migrar dados do Google para o lead</h2>
            <p className="mt-0.5 text-xs text-gray-500">
              Destino: <span className="font-medium text-gray-700">{targetLeadName}</span>
            </p>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 ml-4 shrink-0">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-5 flex-1">
          {loading && (
            <div className="py-10 flex items-center justify-center gap-2 text-sm text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando dados...
            </div>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}

          {prospect && currentLead && (
            <>
              <p className="text-sm text-gray-500">
                Marque os campos que deseja copiar do Google para o lead. Campos pré-marcados são os que o lead ainda não tem.
              </p>

              {/* Column headers */}
              <div className="grid grid-cols-[auto_1fr_auto_1fr] gap-x-3 items-center mb-1 px-1">
                <div className="w-5" />
                <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Google (prospecto)</p>
                <ArrowRight className="h-3.5 w-3.5 text-gray-300" />
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Lead atual</p>
              </div>

              {/* Field rows */}
              <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 overflow-hidden">
                {availableFields.map(({ key, label, format }) => {
                  const prospectVal = fmt(prospect[key], format);
                  const leadVal = fmt(currentLead[key], format);
                  const isEmpty = !currentLead[key];
                  const isBetter = prospect[key] != null && !currentLead[key];

                  return (
                    <label
                      key={key}
                      className={`grid grid-cols-[auto_1fr_auto_1fr] gap-x-3 items-start px-3 py-2.5 cursor-pointer transition-colors ${
                        selected.has(key) ? "bg-purple-50" : "hover:bg-gray-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(key)}
                        onChange={() => toggle(key)}
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                      />
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-0.5">{label}</p>
                        <p className={`text-sm break-words ${selected.has(key) ? "text-purple-800 font-medium" : "text-gray-700"}`}>
                          {prospectVal}
                          {isBetter && (
                            <span className="ml-1.5 inline-block rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700">novo</span>
                          )}
                        </p>
                      </div>
                      <ArrowRight className={`h-3.5 w-3.5 mt-1 shrink-0 ${selected.has(key) ? "text-purple-400" : "text-gray-200"}`} />
                      <div className="min-w-0">
                        <p className="text-sm break-words text-gray-400">
                          {isEmpty ? <span className="italic text-gray-300">vazio</span> : leadVal}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>

              {/* Source Group */}
              <div>
                <p className="mb-1.5 text-sm font-medium text-gray-700">Lote (sourceGroup)</p>
                <p className="mb-2 text-xs text-gray-400">Selecione um lote existente ou digite um novo. Será aplicado ao lead após a migração.</p>
                <div ref={sgRef} className="relative">
                  <input
                    type="text"
                    value={sourceGroup}
                    onChange={(e) => { setSourceGroup(e.target.value); setSgOpen(true); }}
                    onFocus={() => setSgOpen(true)}
                    placeholder="Ex: MatConstrPetropolis270426"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                  {sgOpen && sourceGroups.length > 0 && (
                    <ul className="absolute z-20 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg max-h-48 overflow-y-auto">
                      {sourceGroups
                        .filter((g) => g.toLowerCase().includes(sourceGroup.toLowerCase()))
                        .map((g) => (
                          <li key={g}>
                            <button
                              type="button"
                              onClick={() => { setSourceGroup(g); setSgOpen(false); }}
                              className="w-full px-3 py-2 text-left text-sm hover:bg-purple-50 text-gray-700 font-mono"
                            >
                              {g}
                            </button>
                          </li>
                        ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Labels */}
              <div>
                <p className="mb-1.5 text-sm font-medium text-gray-700">Labels do lead</p>
                <p className="mb-2 text-xs text-gray-400">Adicione ou remova labels. As marcadas serão aplicadas ao lead após a migração.</p>
                <MultiLabelSelect
                  value={labelIds}
                  onChange={setLabelIds}
                  placeholder="Selecione ou crie labels..."
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex gap-3 border-t border-gray-100 bg-white px-6 py-4">
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving || !prospect}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving
              ? "Migrando..."
              : selected.size > 0
              ? `Migrar ${selected.size} campo${selected.size !== 1 ? "s" : ""} + labels`
              : "Apenas atualizar labels"}
          </button>
        </div>
      </div>
    </div>
  );
}
