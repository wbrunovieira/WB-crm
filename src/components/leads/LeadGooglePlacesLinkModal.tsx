"use client";

import { useState } from "react";
import { X, Search, Loader2, ArrowRight, Star, MapPin, Phone, Globe } from "lucide-react";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api-client";

interface PlaceResult {
  placeId: string;
  businessName: string;
  address: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  phone?: string;
  internationalPhone?: string;
  website?: string;
  rating?: number;
  userRatingCount?: number;
  priceLevel?: number;
  businessStatus?: string;
  types?: string[];
  primaryType?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  googleMapsUrl?: string;
  openingHours?: string;
}

interface LeadSnapshot {
  id: string;
  businessName: string;
  registeredName?: string | null;
  city?: string | null;
  address?: string | null;
  state?: string | null;
  zipCode?: string | null;
  country?: string | null;
  phone?: string | null;
  website?: string | null;
  rating?: number | null;
  userRatingsTotal?: number | null;
  priceLevel?: number | null;
  businessStatus?: string | null;
  categories?: string | null;
  types?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  googleMapsUrl?: string | null;
  googleId?: string | null;
  description?: string | null;
  openingHours?: string | null;
}

interface FieldMeta {
  label: string;
  placeKey: keyof PlaceResult;
  leadKey: keyof LeadSnapshot;
  patchKey: string;
  format?: (v: unknown) => string;
}

const FIELD_META: FieldMeta[] = [
  { label: "Endereço",         placeKey: "address",         leadKey: "address",         patchKey: "address" },
  { label: "Cidade",           placeKey: "city",            leadKey: "city",            patchKey: "city" },
  { label: "Estado",           placeKey: "state",           leadKey: "state",           patchKey: "state" },
  { label: "CEP",              placeKey: "zipCode",         leadKey: "zipCode",         patchKey: "zipCode" },
  { label: "País",             placeKey: "country",         leadKey: "country",         patchKey: "country" },
  { label: "Telefone",         placeKey: "phone",           leadKey: "phone",           patchKey: "phone" },
  { label: "Website",          placeKey: "website",         leadKey: "website",         patchKey: "website" },
  { label: "Descrição",        placeKey: "description",     leadKey: "description",     patchKey: "description" },
  { label: "Status",           placeKey: "businessStatus",  leadKey: "businessStatus",  patchKey: "businessStatus" },
  { label: "Avaliação",        placeKey: "rating",          leadKey: "rating",          patchKey: "rating", format: (v) => `${v} ★` },
  { label: "Nº de avaliações", placeKey: "userRatingCount", leadKey: "userRatingsTotal",patchKey: "userRatingsTotal", format: (v) => `${v} avaliações` },
  { label: "Nível de preço",   placeKey: "priceLevel",      leadKey: "priceLevel",      patchKey: "priceLevel", format: (v) => "R$".repeat(Number(v)) },
  { label: "Categoria principal",placeKey: "primaryType",   leadKey: "categories",      patchKey: "categories" },
  { label: "Latitude",         placeKey: "latitude",        leadKey: "latitude",        patchKey: "latitude" },
  { label: "Longitude",        placeKey: "longitude",       leadKey: "longitude",       patchKey: "longitude" },
  { label: "URL Google Maps",  placeKey: "googleMapsUrl",   leadKey: "googleMapsUrl",   patchKey: "googleMapsUrl" },
  { label: "Horários",         placeKey: "openingHours",    leadKey: "openingHours",    patchKey: "openingHours" },
];

function fmt(v: unknown, format?: (v: unknown) => string): string {
  if (v == null || v === "") return "—";
  if (format) return format(v);
  return String(v);
}

interface Props {
  lead: LeadSnapshot;
  onDone: () => void;
  onCancel: () => void;
}

type Step = "search" | "select" | "preview" | "done";

export function LeadGooglePlacesLinkModal({ lead, onDone, onCancel }: Props) {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";

  const defaultQuery = `${lead.businessName}${lead.city ? `, ${lead.city}` : ""}`;
  const registeredQuery = lead.registeredName && lead.registeredName !== lead.businessName
    ? `${lead.registeredName}${lead.city ? `, ${lead.city}` : ""}`
    : null;

  const [step, setStep] = useState<Step>("search");
  const [query, setQuery] = useState(defaultQuery);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [places, setPlaces] = useState<PlaceResult[]>([]);
  const [selected, setSelected] = useState<PlaceResult | null>(null);
  const [checkedFields, setCheckedFields] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  async function doSearch(q: string) {
    setQuery(q);
    setSearching(true);
    setSearchError("");
    try {
      const res = await apiFetch<{ places: PlaceResult[] }>("/leads/google-places/search", token, {
        method: "POST",
        body: JSON.stringify({ textQuery: q }),
      });
      setPlaces(res.places ?? []);
      setStep("select");
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "Erro na busca");
    } finally {
      setSearching(false);
    }
  }

  function selectPlace(place: PlaceResult) {
    setSelected(place);
    // Pre-check fields where lead is empty
    const pre = new Set<string>();
    for (const { patchKey, leadKey, placeKey } of FIELD_META) {
      if (place[placeKey] != null && place[placeKey] !== "" && !lead[leadKey]) {
        pre.add(patchKey);
      }
    }
    setCheckedFields(pre);
    setStep("preview");
  }

  function toggleField(key: string) {
    setCheckedFields((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleSave() {
    if (!selected) return;
    setSaving(true);
    setSaveError("");
    try {
      const patch: Record<string, unknown> = {
        googleId: selected.placeId,
      };
      if (selected.types?.length) patch.types = JSON.stringify(selected.types);

      for (const { patchKey, placeKey } of FIELD_META) {
        if (checkedFields.has(patchKey) && selected[placeKey] != null) {
          patch[patchKey] = selected[placeKey];
        }
      }

      await apiFetch(`/leads/${lead.id}`, token, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      setStep("done");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Erro ao salvar");
      setSaving(false);
    }
  }

  const availableFields = selected
    ? FIELD_META.filter((f) => selected[f.placeKey] != null && selected[f.placeKey] !== "")
    : [];

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-6">
      <div
        className="w-full max-w-2xl rounded-xl bg-white shadow-2xl flex flex-col overflow-hidden"
        style={{ height: "calc(100vh - 3rem)" }}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Vincular Google Places</h2>
            <p className="mt-0.5 text-xs text-gray-500">
              {step === "search" && "Busque a empresa no Google Places"}
              {step === "select" && `${places.length} resultado${places.length !== 1 ? "s" : ""} encontrado${places.length !== 1 ? "s" : ""}`}
              {step === "preview" && `Campos de: ${selected?.businessName}`}
              {step === "done" && "Dados vinculados com sucesso"}
            </p>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 ml-4 shrink-0">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">

          {/* STEP: search */}
          {step === "search" && (
            <div className="space-y-4 pt-2">
              <p className="text-sm text-gray-500">
                A busca usará o nome do lead e a cidade. Você pode editar antes de pesquisar.
              </p>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Termos de busca</label>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && doSearch(query)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  placeholder="Nome da empresa, cidade..."
                />
              </div>
              {searchError && <p className="text-sm text-red-600">{searchError}</p>}
              {registeredQuery && (
                <button
                  type="button"
                  onClick={() => setQuery(registeredQuery)}
                  className="text-xs text-purple-600 hover:text-purple-800 underline"
                >
                  Tentar com razão social: &ldquo;{registeredQuery}&rdquo;
                </button>
              )}
            </div>
          )}

          {/* STEP: select */}
          {step === "select" && (
            <div className="space-y-3">
              {places.length === 0 ? (
                <p className="text-sm text-gray-500 py-8 text-center">Nenhum resultado encontrado.</p>
              ) : (
                places.map((place) => (
                  <button
                    key={place.placeId}
                    type="button"
                    onClick={() => selectPlace(place)}
                    className="w-full text-left rounded-lg border border-gray-200 p-4 hover:border-purple-400 hover:bg-purple-50 transition-colors"
                  >
                    <p className="font-semibold text-gray-900 text-sm">{place.businessName}</p>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500">
                      {place.address && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {place.address}
                        </span>
                      )}
                      {place.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {place.phone}
                        </span>
                      )}
                      {place.website && (
                        <span className="flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          {place.website}
                        </span>
                      )}
                      {place.rating && (
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                          {place.rating.toFixed(1)} ({place.userRatingCount})
                        </span>
                      )}
                    </div>
                    {place.businessStatus && (
                      <span className={`mt-1.5 inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                        place.businessStatus === "OPERATIONAL" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                      }`}>
                        {place.businessStatus}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          )}

          {/* STEP: preview */}
          {step === "preview" && selected && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                Marque os campos que deseja importar do Google Places para este lead. Pré-marcados são os que o lead ainda não possui.
              </p>

              {/* Column headers */}
              <div className="flex items-center gap-2 px-1">
                <div className="w-5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Google Places</p>
                </div>
                <div className="w-5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Lead atual</p>
                </div>
              </div>

              <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 overflow-hidden">
                {availableFields.map(({ patchKey, placeKey, leadKey, label, format }) => {
                  const googleVal = fmt(selected[placeKey], format);
                  const leadVal = fmt(lead[leadKey], format);
                  const isEmpty = !lead[leadKey];
                  const checked = checkedFields.has(patchKey);

                  return (
                    <label
                      key={patchKey}
                      className={`flex items-start gap-2 px-3 py-2.5 cursor-pointer transition-colors ${
                        checked ? "bg-purple-50" : "hover:bg-gray-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleField(patchKey)}
                        className="mt-1 h-4 w-4 shrink-0 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-0.5">{label}</p>
                        <p className={`text-sm break-words ${checked ? "text-purple-800 font-medium" : "text-gray-700"}`}>
                          {googleVal}
                          {isEmpty && (
                            <span className="ml-1.5 inline-block rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700">novo</span>
                          )}
                        </p>
                      </div>
                      <ArrowRight className={`h-3.5 w-3.5 mt-1 shrink-0 ${checked ? "text-purple-400" : "text-gray-200"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm break-words text-gray-400">
                          {isEmpty ? <span className="italic text-gray-300">vazio</span> : leadVal}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>

              {saveError && <p className="text-sm text-red-600">{saveError}</p>}
            </div>
          )}

          {/* STEP: done */}
          {step === "done" && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <Star className="h-6 w-6 text-green-600 fill-green-600" />
              </div>
              <p className="text-base font-semibold text-gray-900">Dados do Google Places vinculados!</p>
              <p className="text-sm text-gray-500">A página do lead será atualizada.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-gray-100 bg-white px-6 py-4">
          {step === "search" && (
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => doSearch(query)}
                disabled={searching || !query.trim()}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                {searching ? "Buscando..." : "Buscar"}
              </button>
            </div>
          )}

          {step === "select" && (
            <div className="flex gap-3">
              <button
                onClick={() => setStep("search")}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Voltar
              </button>
              <button
                onClick={() => { setQuery(registeredQuery ?? defaultQuery); doSearch(registeredQuery ?? defaultQuery); }}
                disabled={searching || !registeredQuery}
                className="flex-1 rounded-lg border border-purple-300 px-4 py-2 text-sm font-medium text-purple-700 hover:bg-purple-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Tentar razão social
              </button>
            </div>
          )}

          {step === "preview" && (
            <div className="flex gap-3">
              <button
                onClick={() => setStep("select")}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Voltar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {saving ? "Salvando..." : checkedFields.size > 0 ? `Importar ${checkedFields.size} campo${checkedFields.size !== 1 ? "s" : ""}` : "Apenas vincular ID"}
              </button>
            </div>
          )}

          {step === "done" && (
            <button
              onClick={onDone}
              className="w-full rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
            >
              Fechar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
