"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api-client";
import type { Campaign, CampaignStatus } from "@/types/campaign";
import { useRouter } from "next/navigation";

const STATUS_LABEL: Record<CampaignStatus, string> = {
  DRAFT: "Rascunho",
  ACTIVE: "Ativa",
  PAUSED: "Pausada",
  FINISHED: "Finalizada",
};

const STATUS_COLOR: Record<CampaignStatus, string> = {
  DRAFT: "bg-gray-700 text-gray-300",
  ACTIVE: "bg-green-900/50 text-green-400 border border-green-700",
  PAUSED: "bg-yellow-900/50 text-yellow-400 border border-yellow-700",
  FINISHED: "bg-purple-900/50 text-purple-300 border border-purple-700",
};

interface Props {
  campaigns: Campaign[];
}

export function CampaignsList({ campaigns }: Props) {
  const router = useRouter();
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const [loading, setLoading] = useState<string | null>(null);

  const handleStart = async (id: string) => {
    setLoading(id + ":start");
    try {
      await apiFetch(`/campaigns/${id}/start`, token, { method: "POST" });
      toast.success("Campanha iniciada!");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao iniciar campanha");
    } finally {
      setLoading(null);
    }
  };

  const handlePause = async (id: string) => {
    setLoading(id + ":pause");
    try {
      await apiFetch(`/campaigns/${id}/pause`, token, { method: "POST" });
      toast.success("Campanha pausada");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao pausar campanha");
    } finally {
      setLoading(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Excluir campanha "${name}"?`)) return;
    setLoading(id + ":delete");
    try {
      await apiFetch(`/campaigns/${id}`, token, { method: "DELETE" });
      toast.success("Campanha excluída");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao excluir campanha");
    } finally {
      setLoading(null);
    }
  };

  if (campaigns.length === 0) {
    return (
      <div className="rounded-xl border border-[#792990]/30 bg-[#1a0022]/50 p-16 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-900/30">
          <svg className="h-8 w-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
          </svg>
        </div>
        <p className="text-lg font-medium text-gray-300">Nenhuma campanha ainda</p>
        <p className="mt-1 text-sm text-gray-500">Crie sua primeira campanha de WhatsApp</p>
        <Link
          href="/campaigns/new"
          className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 transition-colors"
        >
          + Nova Campanha
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {campaigns.map((campaign) => (
        <div
          key={campaign.id}
          className="rounded-xl border border-[#792990]/30 bg-[#1a0022]/70 p-5 flex flex-col gap-4 hover:border-[#792990]/60 transition-colors"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Link
                href={`/campaigns/${campaign.id}`}
                className="block truncate text-base font-semibold text-gray-100 hover:text-purple-300 transition-colors"
              >
                {campaign.name}
              </Link>
              <p className="mt-0.5 truncate text-xs text-gray-500">{campaign.instanceName}</p>
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOR[campaign.status]}`}>
              {STATUS_LABEL[campaign.status]}
            </span>
          </div>

          {/* Description */}
          {campaign.description && (
            <p className="text-xs text-gray-400 line-clamp-2">{campaign.description}</p>
          )}

          {/* Stats row */}
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>{campaign.stepsCount} step{campaign.stepsCount !== 1 ? "s" : ""}</span>
            <span>·</span>
            <span>
              {new Date(campaign.createdAt).toLocaleDateString("pt-BR")}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 border-t border-[#792990]/20 pt-3">
            <Link
              href={`/campaigns/${campaign.id}`}
              className="flex-1 rounded-lg border border-[#792990]/40 px-3 py-1.5 text-center text-xs font-medium text-gray-300 hover:bg-purple-900/30 transition-colors"
            >
              Detalhes
            </Link>

            {campaign.status === "DRAFT" || campaign.status === "PAUSED" ? (
              <button
                onClick={() => handleStart(campaign.id)}
                disabled={loading === campaign.id + ":start"}
                className="flex-1 rounded-lg bg-green-900/40 border border-green-700/50 px-3 py-1.5 text-xs font-medium text-green-400 hover:bg-green-900/70 transition-colors disabled:opacity-50"
              >
                {loading === campaign.id + ":start" ? "..." : "Iniciar"}
              </button>
            ) : campaign.status === "ACTIVE" ? (
              <button
                onClick={() => handlePause(campaign.id)}
                disabled={loading === campaign.id + ":pause"}
                className="flex-1 rounded-lg bg-yellow-900/40 border border-yellow-700/50 px-3 py-1.5 text-xs font-medium text-yellow-400 hover:bg-yellow-900/70 transition-colors disabled:opacity-50"
              >
                {loading === campaign.id + ":pause" ? "..." : "Pausar"}
              </button>
            ) : null}

            {campaign.status !== "ACTIVE" && (
              <button
                onClick={() => handleDelete(campaign.id, campaign.name)}
                disabled={loading === campaign.id + ":delete"}
                className="rounded-lg border border-red-900/40 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-900/20 transition-colors disabled:opacity-50"
              >
                {loading === campaign.id + ":delete" ? "..." : "Excluir"}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
