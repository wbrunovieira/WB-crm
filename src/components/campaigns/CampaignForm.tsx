"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api-client";
import type { Campaign } from "@/types/campaign";

interface AntiBlock {
  minDelayMs: number;
  maxDelayMs: number;
  maxPerHour: number;
}

export function CampaignForm() {
  const router = useRouter();
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    instanceName: "",
    description: "",
  });
  const [antiBlock, setAntiBlock] = useState<AntiBlock>({
    minDelayMs: 3000,
    maxDelayMs: 15000,
    maxPerHour: 60,
  });
  const [showAntiBlock, setShowAntiBlock] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.name.trim()) { setError("Nome é obrigatório"); return; }
    if (!form.instanceName.trim()) { setError("Nome da instância é obrigatório"); return; }

    setLoading(true);
    try {
      const campaign = await apiFetch<Campaign>("/campaigns", token, {
        method: "POST",
        body: JSON.stringify({
          name: form.name.trim(),
          instanceName: form.instanceName.trim(),
          description: form.description.trim() || undefined,
          antiBlockConfig: showAntiBlock ? JSON.stringify(antiBlock) : undefined,
        }),
      });
      toast.success("Campanha criada!");
      router.push(`/campaigns/${campaign.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao criar campanha");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-6">
      {error && (
        <div className="rounded-lg border border-red-700/50 bg-red-900/20 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Name */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-300">
          Nome da campanha <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Ex: Promoção Junho 2025"
          className="w-full rounded-lg border border-[#792990]/40 bg-[#1a0022]/80 px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-[#792990] focus:outline-none"
        />
      </div>

      {/* Instance */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-300">
          Instância Evolution API <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={form.instanceName}
          onChange={(e) => setForm({ ...form, instanceName: e.target.value })}
          placeholder="Ex: wbdigital"
          className="w-full rounded-lg border border-[#792990]/40 bg-[#1a0022]/80 px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-[#792990] focus:outline-none"
        />
        <p className="mt-1 text-xs text-gray-500">
          Nome da instância configurada no Evolution API
        </p>
      </div>

      {/* Description */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-300">Descrição</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={3}
          placeholder="Objetivo desta campanha..."
          className="w-full rounded-lg border border-[#792990]/40 bg-[#1a0022]/80 px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-[#792990] focus:outline-none resize-none"
        />
      </div>

      {/* Anti-block config */}
      <div className="rounded-lg border border-[#792990]/20 bg-[#1a0022]/40 p-4">
        <button
          type="button"
          onClick={() => setShowAntiBlock(!showAntiBlock)}
          className="flex w-full items-center justify-between text-sm font-medium text-gray-300"
        >
          <span>Configuração Anti-Bloqueio</span>
          <span className="text-purple-400">{showAntiBlock ? "▲" : "▼"}</span>
        </button>

        {showAntiBlock && (
          <div className="mt-4 grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-xs text-gray-400">Delay mín. (ms)</label>
              <input
                type="number"
                value={antiBlock.minDelayMs}
                onChange={(e) => setAntiBlock({ ...antiBlock, minDelayMs: Number(e.target.value) })}
                min={500}
                step={500}
                className="w-full rounded-lg border border-[#792990]/40 bg-[#1a0022] px-2 py-1.5 text-sm text-gray-200 focus:border-[#792990] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-400">Delay máx. (ms)</label>
              <input
                type="number"
                value={antiBlock.maxDelayMs}
                onChange={(e) => setAntiBlock({ ...antiBlock, maxDelayMs: Number(e.target.value) })}
                min={1000}
                step={500}
                className="w-full rounded-lg border border-[#792990]/40 bg-[#1a0022] px-2 py-1.5 text-sm text-gray-200 focus:border-[#792990] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-400">Máx/hora</label>
              <input
                type="number"
                value={antiBlock.maxPerHour}
                onChange={(e) => setAntiBlock({ ...antiBlock, maxPerHour: Number(e.target.value) })}
                min={1}
                max={200}
                className="w-full rounded-lg border border-[#792990]/40 bg-[#1a0022] px-2 py-1.5 text-sm text-gray-200 focus:border-[#792990] focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Submit */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-[#792990]/40 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-purple-900/20 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-white hover:bg-purple-700 transition-colors disabled:opacity-50"
        >
          {loading ? "Criando..." : "Criar Campanha"}
        </button>
      </div>
    </form>
  );
}
