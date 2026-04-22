"use client";

import { useState, useEffect, useRef } from "react";
import { X, Search, Loader2, CheckCircle, AlertCircle, MapPin, ChevronDown, ChevronUp } from "lucide-react";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";
import { GOOGLE_PLACE_TYPES } from "@/lib/lists/google-place-types";

interface GoogleLeadsModalProps {
  onClose: () => void;
  onSuccess: (imported: number) => void;
}

export interface ExcludeCriteria {
  withoutPhone?: boolean;
  withoutWebsite?: boolean;
  withoutAddress?: boolean;
  withoutCity?: boolean;
  withoutState?: boolean;
  withoutZipCode?: boolean;
  withoutRating?: boolean;
  withoutUserRatings?: boolean;
  withoutDescription?: boolean;
  withoutCoordinates?: boolean;
  withoutPriceLevel?: boolean;
  onlyOperational?: boolean;
}

class PlacesRateLimitError extends Error {
  retryAfterSeconds: number;
  constructor(retryAfterSeconds = 60) {
    super("Google Places API rate limit exceeded");
    this.name = "PlacesRateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }

  static isRateLimitError(err: unknown): err is PlacesRateLimitError {
    return err instanceof PlacesRateLimitError;
  }
}

interface ImportGoogleLeadsResult {
  success: boolean;
  imported: number;
  skipped: number;
  status: "complete" | "exhausted" | "rate_limited";
  retryAfterSeconds?: number;
  error?: string;
}

interface GooglePlace {
  placeId: string;
  businessName: string;
  address: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  neighborhood?: string;
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

import { getCountryDataList } from "countries-list";

const QUICK_COUNTRIES = ["BR", "PT", "IT", "US"];

// Build full list sorted by PT-BR name using Intl.DisplayNames
const ptNames = new Intl.DisplayNames(["pt-BR"], { type: "region" });
const ALL_COUNTRIES = getCountryDataList()
  .map((c) => ({ value: c.iso2, label: ptNames.of(c.iso2) ?? c.name }))
  .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));

const EXCLUDE_OPTIONS: { key: keyof ExcludeCriteria; label: string }[] = [
  { key: "withoutPhone",        label: "Sem telefone" },
  { key: "withoutWebsite",      label: "Sem website" },
  { key: "withoutAddress",      label: "Sem endereço" },
  { key: "withoutCity",         label: "Sem cidade" },
  { key: "withoutState",        label: "Sem estado" },
  { key: "withoutZipCode",      label: "Sem CEP" },
  { key: "withoutRating",       label: "Sem avaliação no Google" },
  { key: "withoutUserRatings",  label: "Sem número de avaliações" },
  { key: "withoutDescription",  label: "Sem descrição" },
  { key: "withoutCoordinates",  label: "Sem coordenadas" },
  { key: "withoutPriceLevel",   label: "Sem nível de preço" },
  { key: "onlyOperational",     label: "Apenas negócios operacionais" },
];

type ImportStatus = "idle" | "loading" | "success" | "exhausted" | "rate_limited" | "error";

function passesExcludeCriteria(place: GooglePlace, criteria?: ExcludeCriteria): boolean {
  if (!criteria) return true;
  if (criteria.withoutPhone && !place.phone) return false;
  if (criteria.withoutWebsite && !place.website) return false;
  if (criteria.withoutAddress && !place.address) return false;
  if (criteria.withoutCity && !place.city) return false;
  if (criteria.withoutState && !place.state) return false;
  if (criteria.withoutZipCode && !place.zipCode) return false;
  if (criteria.withoutRating && !place.rating) return false;
  if (criteria.withoutUserRatings && !place.userRatingCount) return false;
  if (criteria.withoutDescription && !place.description) return false;
  if (criteria.withoutCoordinates && !place.latitude) return false;
  if (criteria.withoutPriceLevel && place.priceLevel == null) return false;
  if (criteria.onlyOperational && place.businessStatus !== "OPERATIONAL") return false;
  return true;
}

function buildSearchQuery(params: { typeKeyword: string; city?: string; zipCode?: string; country: string }): string {
  const parts = [params.typeKeyword];
  if (params.city) parts.push(`em ${params.city}`);
  if (params.zipCode) parts.push(params.zipCode);
  if (params.country) parts.push(params.country === "BR" ? "Brazil" : params.country);
  return parts.join(", ");
}

export function GoogleLeadsModal({ onClose, onSuccess }: GoogleLeadsModalProps) {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const [country, setCountry] = useState("BR");
  const [countrySearch, setCountrySearch] = useState("");
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const countryRef = useRef<HTMLDivElement>(null);
  const [city, setCity] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [typeKeyword, setTypeKeyword] = useState("");
  const [typeSearch, setTypeSearch] = useState("");
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const typeRef = useRef<HTMLDivElement>(null);
  const [requestedCount, setRequestedCount] = useState(20);
  const [status, setStatus] = useState<ImportStatus>("idle");
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [retryCountdown, setRetryCountdown] = useState(0);
  const [excludeCriteria, setExcludeCriteria] = useState<ExcludeCriteria>({});
  const [showFilters, setShowFilters] = useState(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (typeRef.current && !typeRef.current.contains(e.target as Node)) {
        setShowTypeDropdown(false);
      }
      if (countryRef.current && !countryRef.current.contains(e.target as Node)) {
        setShowCountryDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selectedCountryLabel = ALL_COUNTRIES.find((c) => c.value === country)?.label ?? country;

  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  function startCountdown(seconds: number) {
    setRetryCountdown(seconds);
    countdownRef.current = setInterval(() => {
      setRetryCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          setStatus("idle");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function toggleCriteria(key: keyof ExcludeCriteria) {
    setExcludeCriteria((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const activeFiltersCount = Object.values(excludeCriteria).filter(Boolean).length;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!typeKeyword.trim()) {
      toast.error("Informe o tipo de negócio");
      return;
    }
    if (!city.trim() && !zipCode.trim()) {
      toast.error("Informe cidade ou CEP para localizar a busca");
      return;
    }

    setStatus("loading");
    setResult(null);

    const params = {
      country,
      city: city.trim() || undefined,
      zipCode: zipCode.trim() || undefined,
      typeKeyword: typeKeyword.trim(),
      requestedCount,
      excludeCriteria: activeFiltersCount > 0 ? excludeCriteria : undefined,
    };

    const searchQuery = buildSearchQuery(params);
    let imported = 0;
    let skipped = 0;
    let pageToken: string | undefined;
    let newlySeenIds: string[] = [];
    let fetchedPlaceIds: string[] = [];
    let searchProfileId: string | undefined;

    const updateProfile = async () => {
      if (!searchProfileId) return;
      await apiFetch(`/leads/google-places-searches/${searchProfileId}`, token, {
        method: "PATCH",
        body: JSON.stringify({
          fetchedPlaceIds: JSON.stringify(fetchedPlaceIds),
          newlySeenCount: newlySeenIds.length,
          importedCount: imported,
        }),
      }).catch(() => {});
    };

    let res: ImportGoogleLeadsResult | undefined;

    try {
      const searchProfile = await apiFetch<{ id: string; fetchedPlaceIds: string }>(
        "/leads/google-places-searches/find-or-create",
        token,
        {
          method: "POST",
          body: JSON.stringify({
            country: params.country,
            city: params.city,
            zipCode: params.zipCode,
            typeKeyword: params.typeKeyword,
            searchQuery,
          }),
        },
      );

      searchProfileId = searchProfile.id;
      try {
        const parsed: unknown = JSON.parse(searchProfile.fetchedPlaceIds || "[]");
        fetchedPlaceIds = Array.isArray(parsed) ? (parsed as string[]) : [];
      } catch {
        fetchedPlaceIds = [];
      }

      while (imported < params.requestedCount) {
        const result = await apiFetch<{ places: GooglePlace[]; nextPageToken?: string }>(
          "/leads/google-places/search",
          token,
          { method: "POST", body: JSON.stringify({ textQuery: searchQuery, pageToken }) },
        ).catch((err: unknown) => {
          if (err instanceof Error && (err as Error & { status?: number }).status === 429) {
            const body = (err as Error & { body?: { retryAfterSeconds?: number } }).body;
            throw new PlacesRateLimitError(body?.retryAfterSeconds ?? 60);
          }
          throw err;
        });

        if (result.places.length === 0) {
          await updateProfile();
          res = { success: true, imported, skipped, status: "exhausted" };
          break;
        }

        for (const place of result.places) {
          if (!place.placeId) { skipped++; continue; }
          if (fetchedPlaceIds.includes(place.placeId)) { skipped++; continue; }

          newlySeenIds.push(place.placeId);
          fetchedPlaceIds.push(place.placeId);

          if (!passesExcludeCriteria(place, params.excludeCriteria)) { skipped++; continue; }

          const { exists } = await apiFetch<{ exists: boolean }>(
            `/leads/check-google-id?googleId=${encodeURIComponent(place.placeId)}`,
            token,
          );
          if (exists) { skipped++; continue; }

          await apiFetch("/leads", token, {
            method: "POST",
            body: JSON.stringify({
              googleId: place.placeId,
              businessName: place.businessName,
              address: place.address,
              city: place.city,
              state: place.state,
              zipCode: place.zipCode,
              country: place.country,
              vicinity: place.neighborhood ?? null,
              phone: place.phone,
              whatsapp: place.internationalPhone ?? null,
              website: place.website,
              rating: place.rating,
              userRatingsTotal: place.userRatingCount,
              priceLevel: place.priceLevel,
              businessStatus: place.businessStatus,
              types: place.types ? JSON.stringify(place.types) : null,
              categories: place.primaryType ?? null,
              description: place.description,
              latitude: place.latitude,
              longitude: place.longitude,
              googleMapsUrl: place.googleMapsUrl,
              openingHours: place.openingHours ?? null,
              source: "google_places",
              searchTerm: searchQuery,
              isProspect: true,
              googlePlacesSearchId: searchProfileId,
            }),
          });

          imported++;
          if (imported >= params.requestedCount) break;
        }

        if (imported >= params.requestedCount || res !== undefined) break;

        if (!result.nextPageToken) {
          await updateProfile();
          res = { success: true, imported, skipped, status: "exhausted" };
          break;
        }

        pageToken = result.nextPageToken;
        await new Promise((r) => setTimeout(r, 2000));
      }

      if (res === undefined) {
        await updateProfile();
        res = { success: true, imported, skipped, status: "complete" };
      }
    } catch (err) {
      await updateProfile();
      if (err instanceof PlacesRateLimitError) {
        res = { success: false, imported, skipped, status: "rate_limited", retryAfterSeconds: err.retryAfterSeconds };
      } else {
        res = { success: false, imported, skipped, status: "complete", error: err instanceof Error ? err.message : String(err) };
      }
    }

    if (!res) return; // should not happen, but guard for TypeScript

    if (res.status === "rate_limited") {
      setStatus("rate_limited");
      startCountdown(res.retryAfterSeconds ?? 60);
      return;
    }

    if (!res.success && res.status !== "exhausted") {
      setStatus("error");
      toast.error(res.error ?? "Erro ao buscar leads");
      return;
    }

    setResult({ imported: res.imported, skipped: res.skipped });
    setStatus(res.status === "exhausted" ? "exhausted" : "success");

    if (res.imported > 0) {
      onSuccess(res.imported);
    }
  }

  const isLoading = status === "loading";
  const isRateLimited = status === "rate_limited";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-gray-900">Buscar Prospectos no Google</h2>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Result feedback */}
        {result && (
          <div
            className={`mb-5 rounded-lg border p-4 ${
              status === "exhausted"
                ? "border-amber-200 bg-amber-50"
                : "border-green-200 bg-green-50"
            }`}
          >
            <div className="flex items-start gap-3">
              <CheckCircle
                className={`mt-0.5 h-5 w-5 shrink-0 ${
                  status === "exhausted" ? "text-amber-500" : "text-green-500"
                }`}
              />
              <div>
                <p className="font-semibold text-gray-900">
                  {result.imported > 0
                    ? `${result.imported} prospecto${result.imported > 1 ? "s" : ""} adicionado${result.imported > 1 ? "s" : ""} para análise`
                    : "Nenhum prospecto novo encontrado"}
                </p>
                {result.skipped > 0 && (
                  <p className="text-sm text-gray-600">
                    {result.skipped} ignorado{result.skipped > 1 ? "s" : ""} (já existem ou não atenderam os critérios)
                  </p>
                )}
                {status === "exhausted" && (
                  <p className="mt-1 text-sm text-amber-700">
                    Google não tem mais resultados para esta busca.
                  </p>
                )}
                {result.imported > 0 && (
                  <p className="mt-1 text-sm text-gray-500">
                    Acesse <strong>Prospectos</strong> no menu para analisar e qualificar.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Rate limit warning */}
        {isRateLimited && (
          <div className="mb-5 rounded-lg border border-orange-200 bg-orange-50 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-orange-500" />
              <div>
                <p className="font-semibold text-gray-900">Limite da API do Google atingido</p>
                <p className="text-sm text-orange-700">
                  Disponível novamente em{" "}
                  <span className="font-mono font-bold">
                    0:{String(retryCountdown).padStart(2, "0")}
                  </span>
                </p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Quantidade */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Quantos prospectos buscar
            </label>
            <input
              type="number"
              min={1}
              max={200}
              value={requestedCount}
              onChange={(e) => setRequestedCount(Math.max(1, Number(e.target.value) || 1))}
              disabled={isLoading || isRateLimited}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <div className="mt-1.5 flex gap-1.5">
              {[5, 10, 20, 50, 100].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRequestedCount(n)}
                  disabled={isLoading || isRateLimited}
                  className={`rounded border px-2 py-0.5 text-xs font-medium transition-colors ${
                    requestedCount === n
                      ? "border-primary bg-primary text-white"
                      : "border-[#792990]/50 bg-[#2d1b3d] text-gray-300 hover:border-[#792990] hover:text-white"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* País */}
          <div ref={countryRef}>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">País</label>
            {/* Quick picks */}
            <div className="mb-1.5 flex gap-1.5">
              {QUICK_COUNTRIES.map((code) => {
                const label = ALL_COUNTRIES.find((c) => c.value === code)?.label ?? code;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => { setCountry(code); setCountrySearch(""); }}
                    disabled={isLoading || isRateLimited}
                    className={`rounded border px-2.5 py-1 text-xs font-medium transition-colors ${
                      country === code
                        ? "border-primary bg-primary text-white"
                        : "border-[#792990]/50 bg-[#2d1b3d] text-gray-300 hover:border-[#792990] hover:text-white"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <div className="relative">
              <input
                type="text"
                value={countrySearch || (showCountryDropdown ? "" : selectedCountryLabel)}
                onChange={(e) => { setCountrySearch(e.target.value); setShowCountryDropdown(true); }}
                onFocus={() => { setCountrySearch(""); setShowCountryDropdown(true); }}
                placeholder="Buscar país..."
                disabled={isLoading || isRateLimited}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-8 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-gray-400" />
              {showCountryDropdown && (() => {
                const term = countrySearch.toLowerCase();
                const filtered = ALL_COUNTRIES.filter(
                  (c) => c.label.toLowerCase().includes(term) || c.value.toLowerCase().includes(term)
                );
                return filtered.length > 0 ? (
                  <div className="absolute z-10 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                    {filtered.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => { setCountry(c.value); setCountrySearch(""); setShowCountryDropdown(false); }}
                        className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-purple-50 ${
                          country === c.value ? "bg-purple-50 font-medium text-primary" : "text-gray-700"
                        }`}
                      >
                        <span>{c.label}</span>
                        <span className="font-mono text-xs text-gray-400">{c.value}</span>
                      </button>
                    ))}
                  </div>
                ) : null;
              })()}
            </div>
          </div>

          {/* CEP / Cidade */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                CEP
                {!zipCode && <span className="ml-1 font-normal text-gray-400">(ou cidade)</span>}
              </label>
              <input
                type="text"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                placeholder="Ex: 01310-100"
                disabled={isLoading || isRateLimited}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Cidade
                {zipCode && <span className="ml-1 font-normal text-gray-400">(opcional com CEP)</span>}
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ex: São Paulo"
                disabled={isLoading || isRateLimited || !!zipCode}
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary ${
                  zipCode ? "border-gray-200 bg-gray-50 text-gray-400" : "border-gray-300"
                }`}
              />
            </div>
          </div>

          {/* Tipo de negócio */}
          <div ref={typeRef}>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Tipo de negócio
            </label>
            <div className="relative">
              <input
                type="text"
                value={typeSearch}
                onChange={(e) => { setTypeSearch(e.target.value); setShowTypeDropdown(true); }}
                onFocus={() => setShowTypeDropdown(true)}
                placeholder="Buscar tipo... ex: clínica, restaurante, advogado"
                disabled={isLoading || isRateLimited}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-8 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <Search className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-gray-400" />

              {showTypeDropdown && (() => {
                const term = typeSearch.toLowerCase();
                const filtered = GOOGLE_PLACE_TYPES.filter(
                  (t) =>
                    t.label.toLowerCase().includes(term) ||
                    t.value.toLowerCase().includes(term) ||
                    t.category.toLowerCase().includes(term)
                );
                if (filtered.length === 0) return null;

                // Group by category
                const groups: Record<string, typeof filtered> = {};
                filtered.forEach((t) => {
                  if (!groups[t.category]) groups[t.category] = [];
                  groups[t.category].push(t);
                });

                return (
                  <div className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                    {Object.entries(groups).map(([cat, items]) => (
                      <div key={cat}>
                        <div className="sticky top-0 bg-gray-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                          {cat}
                        </div>
                        {items.map((t) => (
                          <button
                            key={t.value}
                            type="button"
                            onClick={() => {
                              setTypeKeyword(t.value);
                              setTypeSearch(t.label);
                              setShowTypeDropdown(false);
                            }}
                            className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-purple-50 ${
                              typeKeyword === t.value ? "bg-purple-50 font-medium text-primary" : "text-gray-700"
                            }`}
                          >
                            <span>{t.label}</span>
                            <span className="ml-2 shrink-0 font-mono text-[11px] text-gray-400">{t.value}</span>
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
            {typeKeyword && (
              <p className="mt-1 text-xs text-gray-400">
                Enviando ao Google:{" "}
                <span className="font-mono text-gray-600">{typeKeyword}</span>
                {" · "}
                <button
                  type="button"
                  onClick={() => { setTypeKeyword(""); setTypeSearch(""); }}
                  className="text-red-400 hover:text-red-600"
                >
                  limpar
                </button>
              </p>
            )}
          </div>

          {/* Critérios de Exclusão */}
          <div className="rounded-lg border border-gray-200">
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              disabled={isLoading || isRateLimited}
              className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg"
            >
              <span className="flex items-center gap-2">
                Critérios de exclusão
                {activeFiltersCount > 0 && (
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                    {activeFiltersCount}
                  </span>
                )}
              </span>
              {showFilters ? (
                <ChevronUp className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-400" />
              )}
            </button>

            {showFilters && (
              <div className="border-t border-gray-200 px-4 pb-4 pt-3">
                <p className="mb-3 text-xs text-gray-500">
                  Desconsiderar prospectos que não possuam:
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  {EXCLUDE_OPTIONS.map(({ key, label }) => (
                    <label
                      key={key}
                      className="flex cursor-pointer items-center gap-2 text-sm text-gray-700"
                    >
                      <input
                        type="checkbox"
                        checked={!!excludeCriteria[key]}
                        onChange={() => toggleCriteria(key)}
                        disabled={isLoading || isRateLimited}
                        className="h-4 w-4 rounded accent-primary"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {result ? "Fechar" : "Cancelar"}
            </button>
            <button
              type="submit"
              disabled={isLoading || isRateLimited}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Buscando...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  {result ? "Buscar mais" : "Buscar prospectos"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
