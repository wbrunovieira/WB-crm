"use client";

import { useState, useEffect, useRef } from "react";
import { X, Search, Loader2, CheckCircle, AlertCircle, MapPin } from "lucide-react";
import { importGoogleLeads } from "@/actions/google-leads";
import { getSectorsForSelect } from "@/actions/sectors";
import { toast } from "sonner";

interface GoogleLeadsModalProps {
  onClose: () => void;
  onSuccess: (imported: number) => void;
}

const COUNTRY_OPTIONS = [
  { value: "BR", label: "Brasil" },
  { value: "US", label: "Estados Unidos" },
  { value: "PT", label: "Portugal" },
  { value: "AR", label: "Argentina" },
  { value: "MX", label: "México" },
];

type Sector = { id: string; name: string; slug: string };

type ImportStatus = "idle" | "loading" | "success" | "exhausted" | "rate_limited" | "error";

export function GoogleLeadsModal({ onClose, onSuccess }: GoogleLeadsModalProps) {
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [country, setCountry] = useState("BR");
  const [city, setCity] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [typeKeyword, setTypeKeyword] = useState("");
  const [requestedCount, setRequestedCount] = useState(20);
  const [status, setStatus] = useState<ImportStatus>("idle");
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [retryCountdown, setRetryCountdown] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    getSectorsForSelect().then(setSectors);
  }, []);

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!typeKeyword.trim()) {
      toast.error("Informe o tipo de negócio");
      return;
    }
    if (!city.trim() && !zipCode.trim()) {
      toast.error("Informe cidade ou CEP");
      return;
    }

    setStatus("loading");
    setResult(null);

    const res = await importGoogleLeads({
      country,
      city: city.trim() || undefined,
      zipCode: zipCode.trim() || undefined,
      typeKeyword: typeKeyword.trim(),
      requestedCount,
    });

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
      <div className="relative w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-gray-900">Buscar Leads no Google</h2>
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
                    ? `${result.imported} lead${result.imported > 1 ? "s" : ""} importado${result.imported > 1 ? "s" : ""}`
                    : "Nenhum lead novo encontrado"}
                </p>
                {result.skipped > 0 && (
                  <p className="text-sm text-gray-600">
                    {result.skipped} já existia{result.skipped > 1 ? "m" : ""} no sistema
                  </p>
                )}
                {status === "exhausted" && (
                  <p className="mt-1 text-sm text-amber-700">
                    Google não tem mais resultados para esta busca.
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
              Quantos leads buscar
            </label>
            <select
              value={requestedCount}
              onChange={(e) => setRequestedCount(Number(e.target.value))}
              disabled={isLoading || isRateLimited}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {[5, 10, 20, 30, 50].map((n) => (
                <option key={n} value={n}>
                  {n} leads
                </option>
              ))}
            </select>
          </div>

          {/* País */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">País</label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              disabled={isLoading || isRateLimited}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {COUNTRY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Cidade / CEP */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Cidade</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ex: São Paulo"
                disabled={isLoading || isRateLimited}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                CEP <span className="font-normal text-gray-400">(opcional)</span>
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
          </div>

          {/* Tipo de negócio */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Tipo de negócio
            </label>
            <input
              type="text"
              value={typeKeyword}
              onChange={(e) => setTypeKeyword(e.target.value)}
              placeholder="Ex: clínica médica, restaurante, advocacia..."
              disabled={isLoading || isRateLimited}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {/* Sugestões de setores cadastrados */}
            {sectors.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {sectors.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setTypeKeyword(s.name)}
                    disabled={isLoading || isRateLimited}
                    className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${
                      typeKeyword === s.name
                        ? "border-primary bg-primary text-white"
                        : "border-gray-200 bg-gray-50 text-gray-600 hover:border-primary hover:text-primary"
                    }`}
                  >
                    {s.name}
                  </button>
                ))}
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
                  {result ? "Buscar mais" : "Buscar leads"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
