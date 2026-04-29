import { backendFetch } from "@/lib/backend/client";
import type { CallAnalysis } from "@/types/call-analysis";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import BackButton from "@/components/ui/BackButton";

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-gray-400">—</span>;
  const color =
    score >= 80
      ? "bg-green-100 text-green-800"
      : score >= 50
        ? "bg-yellow-100 text-yellow-800"
        : "bg-red-100 text-red-800";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${color}`}>
      {score}/100
    </span>
  );
}

function RiskBadge({ risk }: { risk: string | null }) {
  if (!risk) return <span className="text-gray-400">—</span>;
  const color =
    risk === "BAIXO"
      ? "bg-green-100 text-green-800"
      : risk === "MÉDIO"
        ? "bg-yellow-100 text-yellow-800"
        : "bg-red-100 text-red-800";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${color}`}>
      {risk}
    </span>
  );
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

export default async function CallAnalysesPage() {
  const analyses = await backendFetch<CallAnalysis[]>("/call-analysis").catch(
    () => [] as CallAnalysis[],
  );

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center gap-3">
        <BackButton />
        <div>
          <h1 className="text-2xl font-bold">Análises SPICED</h1>
          <p className="text-sm text-gray-500">
            Análises de qualidade de ligações com metodologia SPICED
          </p>
        </div>
      </div>

      {analyses.length === 0 ? (
        <div className="rounded-lg bg-white p-12 text-center shadow">
          <p className="text-gray-500">Nenhuma análise encontrada.</p>
          <p className="mt-1 text-sm text-gray-400">
            As análises são geradas automaticamente quando uma ligação é marcada como
            &ldquo;Decisor&rdquo;.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs font-medium uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-6 py-3 text-left">Atividade</th>
                <th className="px-6 py-3 text-left">Data</th>
                <th className="px-6 py-3 text-left">Score</th>
                <th className="px-6 py-3 text-left">Risco No-Show</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-left">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {analyses.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <Link
                      href={`/activities/${a.activityId}`}
                      className="text-primary hover:underline font-medium"
                    >
                      Ver atividade
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {formatDate(a.createdAt)}
                  </td>
                  <td className="px-6 py-4">
                    <ScoreBadge score={a.score} />
                  </td>
                  <td className="px-6 py-4">
                    <RiskBadge risk={a.noShowRisk} />
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={a.status} />
                  </td>
                  <td className="px-6 py-4">
                    {a.status === "completed" && (
                      <Link
                        href={`/call-analyses/${a.id}`}
                        className="rounded-md bg-primary px-3 py-1 text-xs font-semibold text-white hover:opacity-90"
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
  );
}
