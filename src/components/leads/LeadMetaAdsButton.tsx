"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api-client";
import { useRouter } from "next/navigation";

interface MetaAdsData {
  hasAds: boolean;
  activeCount: number;
  checkedAt: string;
  searchTerm: string;
}

interface LeadMetaAdsButtonProps {
  leadId: string;
  instagram: string;
  existing?: MetaAdsData | null;
}

type Status = "idle" | "checking" | "done" | "error";

function parseExisting(metaAds?: string | null): MetaAdsData | null {
  if (!metaAds) return null;
  try { return JSON.parse(metaAds) as MetaAdsData; } catch { return null; }
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function LeadMetaAdsButton({ leadId, instagram, existing }: LeadMetaAdsButtonProps) {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const router = useRouter();

  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<MetaAdsData | null>(null);
  const [error, setError] = useState("");

  const current = result ?? existing;

  async function handleCheck() {
    setStatus("checking");
    setError("");
    try {
      const res = await apiFetch<{ ok: boolean; hasAds: boolean; activeCount: number; checkedAt: string }>(
        `/meta-ads/verify/lead/${leadId}`,
        token,
        { method: "POST" },
      );
      setResult({
        hasAds: res.hasAds,
        activeCount: res.activeCount,
        checkedAt: res.checkedAt,
        searchTerm: instagram.replace(/^@/, ""),
      });
      setStatus("done");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao verificar");
      setStatus("error");
    }
  }

  if (status === "checking") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-gray-400">
        <SpinnerIcon className="h-3.5 w-3.5 animate-spin" />
        Consultando Meta...
      </span>
    );
  }

  if (status === "error") {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="text-xs text-red-400" title={error}>Erro</span>
        <button onClick={() => setStatus("idle")} className="text-xs text-gray-400 hover:text-gray-300">↺</button>
      </span>
    );
  }

  if (current) {
    return (
      <span className="inline-flex items-center gap-1.5 flex-wrap">
        {current.hasAds ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-900/60 px-2 py-0.5 text-xs font-medium text-green-300"
            title={`Verificado em ${formatDate(current.checkedAt)}`}>
            <AdsIcon className="h-3 w-3" />
            {current.activeCount} anúncio{current.activeCount !== 1 ? "s" : ""} ativo{current.activeCount !== 1 ? "s" : ""}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-800 px-2 py-0.5 text-xs font-medium text-gray-400"
            title={`Verificado em ${formatDate(current.checkedAt)}`}>
            <NoAdsIcon className="h-3 w-3" />
            Sem anúncios
          </span>
        )}
        <button onClick={handleCheck} className="text-xs text-gray-400 hover:text-purple-400" title="Re-verificar">↺</button>
      </span>
    );
  }

  return (
    <button
      onClick={handleCheck}
      title={`Verificar anúncios Meta para ${instagram}`}
      className="inline-flex items-center justify-center rounded-full border border-blue-400/50 bg-blue-950/40 p-1 text-blue-400 hover:bg-blue-900/60 hover:border-blue-300 transition-colors"
    >
      <AdsIcon className="h-3.5 w-3.5" />
    </button>
  );
}

function AdsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className={className}>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
      <path d="M7 8h3v5H7zM14 8l3 5M14 13l3-5" />
    </svg>
  );
}

function NoAdsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className={className}>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4M4.5 4.5l15 15" />
    </svg>
  );
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={3} strokeOpacity={0.25} />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
    </svg>
  );
}
