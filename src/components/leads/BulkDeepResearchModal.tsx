"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { BrainCircuit, X } from "lucide-react";
import { apiFetch } from "@/lib/api-client";

interface Props {
  leadIds: string[];
  researchedCount: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function BulkDeepResearchModal({ leadIds, researchedCount, onClose, onSuccess }: Props) {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const router = useRouter();

  const [skipResearched, setSkipResearched] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const eligible = skipResearched ? leadIds.length - researchedCount : leadIds.length;

  async function handleStart() {
    if (eligible === 0) return;
    setLoading(true);
    setError("");
    try {
      await apiFetch("/leads/bulk-deep-research", token, {
        method: "POST",
        body: JSON.stringify({ leadIds, skipResearched }),
      });
      router.refresh();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao iniciar pesquisa em lote");
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BrainCircuit className="h-5 w-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-900">Pesquisa IA em Lote</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg bg-purple-50 border border-purple-200 p-4">
            <p className="text-sm text-purple-800">
              <span className="font-semibold">{leadIds.length} leads</span> selecionados
              {researchedCount > 0 && (
                <span className="text-purple-600"> · {researchedCount} já com pesquisa IA</span>
              )}
            </p>
          </div>

          {researchedCount > 0 && (
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={skipResearched}
                onChange={(e) => setSkipResearched(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-sm text-gray-700">
                Pular leads que já tiveram pesquisa IA
                <span className="block text-xs text-gray-500 mt-0.5">
                  {skipResearched
                    ? `Serão pesquisados ${eligible} leads`
                    : `Todos os ${leadIds.length} leads serão re-pesquisados`}
                </span>
              </span>
            </label>
          )}

          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
            <p className="text-xs text-amber-800">
              Os leads são processados <strong>um por vez</strong> para garantir qualidade. O progresso aparece no topo da página de leads.
            </p>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleStart}
            disabled={loading || eligible === 0}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <BrainCircuit className="h-4 w-4" />
            {loading ? "Iniciando..." : `Pesquisar ${eligible} leads`}
          </button>
        </div>
      </div>
    </div>
  );
}
