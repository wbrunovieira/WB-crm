"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";

interface MetaAdsData {
  hasAds: boolean;
  activeCount: number;
  checkedAt: string;
}

interface Props {
  leadId: string;
  instagram?: string | null;
  businessName?: string;
  existing?: MetaAdsData | null;
}

export function LeadMetaAdsInline({ leadId, instagram, businessName, existing }: Props) {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const router = useRouter();

  const [editing, setEditing] = useState(false);
  const [count, setCount] = useState("1");
  const [saving, setSaving] = useState(false);

  const libraryUrl = `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&q=${encodeURIComponent(businessName ?? instagram?.replace(/^@/, "") ?? "")}`;

  async function save(hasAds: boolean) {
    setSaving(true);
    const metaAds = JSON.stringify({
      hasAds,
      activeCount: hasAds ? Number(count) || 1 : 0,
      checkedAt: new Date().toISOString(),
    });
    try {
      await apiFetch(`/leads/${leadId}`, token, {
        method: "PATCH",
        body: JSON.stringify({ metaAds }),
      });
      router.refresh();
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Tem anúncios ativos?</span>
          <button onClick={() => setEditing(false)} className="ml-auto text-xs text-gray-500 hover:text-gray-300">✕</button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1">
            <input
              type="number"
              min="1"
              value={count}
              onChange={e => setCount(e.target.value)}
              className="w-14 rounded bg-gray-800 border border-gray-700 px-2 py-0.5 text-xs text-gray-200"
              placeholder="Qtd"
            />
            <button
              onClick={() => save(true)}
              disabled={saving}
              className="rounded bg-green-800/60 border border-green-700 px-2 py-0.5 text-xs text-green-300 hover:bg-green-700/60 disabled:opacity-50"
            >
              Sim
            </button>
          </div>
          <button
            onClick={() => save(false)}
            disabled={saving}
            className="rounded bg-gray-800 border border-gray-700 px-2 py-0.5 text-xs text-gray-400 hover:bg-gray-700 disabled:opacity-50"
          >
            Não tem
          </button>
        </div>
      </div>
    );
  }

  if (existing) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-sm font-medium ${existing.hasAds ? "text-green-400" : "text-gray-400"}`}>
          {existing.hasAds
            ? `✓ ${existing.activeCount} anúncio${existing.activeCount !== 1 ? "s" : ""} ativo${existing.activeCount !== 1 ? "s" : ""}`
            : "Sem anúncios ativos"}
          <span className="ml-1 text-xs text-gray-500">· {new Date(existing.checkedAt).toLocaleDateString("pt-BR")}</span>
        </span>
        {instagram && (
          <a href={libraryUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300" title="Abrir Biblioteca de Anúncios">
            <AdsIcon className="h-3.5 w-3.5" />
          </a>
        )}
        <button onClick={() => setEditing(true)} className="text-xs text-gray-500 hover:text-gray-300" title="Atualizar">↺</button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {instagram && (
        <a href={libraryUrl} target="_blank" rel="noopener noreferrer"
          title="Verificar na Biblioteca de Anúncios"
          className="inline-flex items-center justify-center rounded-full border border-blue-400/50 bg-blue-950/40 p-1 text-blue-400 hover:bg-blue-900/60 hover:border-blue-300 transition-colors">
          <AdsIcon className="h-3.5 w-3.5" />
        </a>
      )}
      <button
        onClick={() => setEditing(true)}
        className="text-xs text-gray-500 hover:text-purple-400 underline underline-offset-2"
      >
        Marcar resultado
      </button>
    </div>
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
