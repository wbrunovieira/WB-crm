"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";

interface GkAnalysis {
  id: string;
  activityId: string;
  score: number | null;
  status: string;
  createdAt: string;
}

interface GkBatch {
  id: string;
  status: string;
  overallScore: number | null;
  newSummary: string | null;
  analysisIds: string[] | null;
  createdAt: string;
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-gray-400">—</span>;
  const color = score >= 4 ? "bg-green-100 text-green-800" : score >= 3 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${color}`}>{score}/5</span>;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-gray-100 text-gray-700",
    processing: "bg-blue-100 text-blue-700",
    completed: "bg-green-100 text-green-800",
    error: "bg-red-100 text-red-800",
  };
  const labels: Record<string, string> = {
    pending: "Pendente",
    processing: "Processando",
    completed: "Concluída",
    error: "Erro",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${map[status] ?? "bg-gray-100 text-gray-700"}`}>
      {labels[status] ?? status}
    </span>
  );
}

export function GatekeeperTab({ analyses, batches }: { analyses: GkAnalysis[]; batches: GkBatch[] }) {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [triggering, setTriggering] = useState(false);

  const completedAnalyses = analyses.filter((a) => a.status === "completed");

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === completedAnalyses.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(completedAnalyses.map((a) => a.id)));
    }
  };

  const handleTriggerBatch = async () => {
    if (selected.size === 0) return;
    setTriggering(true);
    try {
      await apiFetch("/gatekeeper-analysis/trigger-batch", token, {
        method: "POST",
        body: JSON.stringify({ analysisIds: Array.from(selected) }),
      });
      toast.success("Análise de lote iniciada");
      setSelected(new Set());
      router.refresh();
    } catch {
      toast.error("Erro ao iniciar análise de lote");
    } finally {
      setTriggering(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Individual analyses */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Análises Individuais (RAPORT)</h2>
          {selected.size > 0 && (
            <button
              onClick={handleTriggerBatch}
              disabled={triggering}
              className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50 transition-colors"
            >
              {triggering ? "Enviando…" : `Analisar em Lote (${selected.size})`}
            </button>
          )}
        </div>

        {analyses.length === 0 ? (
          <div className="rounded-lg bg-white p-12 text-center shadow">
            <p className="text-gray-500">Nenhuma análise gatekeeper encontrada.</p>
            <p className="mt-1 text-sm text-gray-400">
              Acione a análise RAPORT nas atividades de ligação gatekeeper que possuem transcrição.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg bg-white shadow">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs font-medium uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selected.size === completedAnalyses.length && completedAnalyses.length > 0}
                      onChange={toggleAll}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="px-6 py-3 text-left">Atividade</th>
                  <th className="px-6 py-3 text-left">Data</th>
                  <th className="px-6 py-3 text-left">Score</th>
                  <th className="px-6 py-3 text-left">Status</th>
                  <th className="px-6 py-3 text-left">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {analyses.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      {a.status === "completed" && (
                        <input
                          type="checkbox"
                          checked={selected.has(a.id)}
                          onChange={() => toggleSelect(a.id)}
                          className="rounded border-gray-300"
                        />
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Link href={`/activities/${a.activityId}`} className="text-primary hover:underline font-medium">
                        Ver atividade
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{formatDate(a.createdAt)}</td>
                    <td className="px-6 py-4"><ScoreBadge score={a.score} /></td>
                    <td className="px-6 py-4"><StatusBadge status={a.status} /></td>
                    <td className="px-6 py-4">
                      {a.status === "completed" && (
                        <Link
                          href={`/gk-analyses/${a.id}`}
                          className="rounded-md bg-orange-600 px-3 py-1 text-xs font-semibold text-white hover:opacity-90"
                        >
                          Ver análise
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Batch history */}
      {batches.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-gray-800">Histórico de Lotes</h2>
          <div className="overflow-hidden rounded-lg bg-white shadow">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs font-medium uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-6 py-3 text-left">Data</th>
                  <th className="px-6 py-3 text-left">Ligações</th>
                  <th className="px-6 py-3 text-left">Score Médio</th>
                  <th className="px-6 py-3 text-left">Status</th>
                  <th className="px-6 py-3 text-left">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {batches.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-gray-600">{formatDate(b.createdAt)}</td>
                    <td className="px-6 py-4 text-gray-700">{b.analysisIds?.length ?? "—"}</td>
                    <td className="px-6 py-4"><ScoreBadge score={b.overallScore} /></td>
                    <td className="px-6 py-4"><StatusBadge status={b.status} /></td>
                    <td className="px-6 py-4">
                      {b.status === "completed" && (
                        <Link
                          href={`/gk-batches/${b.id}`}
                          className="rounded-md bg-orange-600 px-3 py-1 text-xs font-semibold text-white hover:opacity-90"
                        >
                          Ver lote
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
