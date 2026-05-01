import { backendFetch } from "@/lib/backend/client";
import { notFound } from "next/navigation";
import Link from "next/link";
import BackButton from "@/components/ui/BackButton";

interface DimensionAverages {
  recepcao?: number;
  alianca?: number;
  perguntas?: number;
  objecoes?: number;
  resultado?: number;
  tecnicas?: number;
}

interface Patterns {
  working?: string[];
  notWorking?: string[];
  keepDoing?: string[];
}

interface ComparisonWithHistory {
  improved?: string[];
  worsened?: string[];
  unchanged?: string[];
  firstBatch?: boolean;
}

interface IndividualHighlight {
  activityId: string;
  score?: number;
  highlight?: string;
}

interface GkBatch {
  id: string;
  status: string;
  errorMsg: string | null;
  overallScore: number | null;
  dimensionAverages: DimensionAverages | null;
  patterns: Patterns | null;
  comparisonWithHistory: ComparisonWithHistory | null;
  individualHighlights: IndividualHighlight[] | null;
  recommendations: string[] | null;
  newSummary: string | null;
  positivePoints: string[] | null;
  improvementPoints: string[] | null;
  createdAt: string;
}

function ScoreBar({ label, score }: { label: string; score?: number }) {
  if (score === undefined) return null;
  const color = score >= 4 ? "bg-green-500" : score >= 3 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 shrink-0 text-xs text-gray-600">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${(score / 5) * 100}%` }} />
      </div>
      <span className="w-8 text-right text-xs font-semibold text-gray-700">{score}/5</span>
    </div>
  );
}

function StringList({ items, color = "text-gray-700", prefix = "•" }: { items?: string[]; color?: string; prefix?: string }) {
  if (!items?.length) return null;
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className={`flex items-start gap-2 text-sm ${color}`}>
          <span className="mt-0.5 flex-shrink-0">{prefix}</span>{item}
        </li>
      ))}
    </ul>
  );
}

export default async function GkBatchDetailPage({ params }: { params: { id: string } }) {
  const batch = await backendFetch<GkBatch>(`/gatekeeper-batches/${params.id}`).catch(() => null);
  if (!batch) notFound();

  const scoreColor =
    (batch.overallScore ?? 0) >= 4 ? "text-green-600"
    : (batch.overallScore ?? 0) >= 3 ? "text-yellow-600"
    : "text-red-600";

  return (
    <div className="mx-auto max-w-5xl p-8">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <BackButton />
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Análise de Lote — Gatekeeper</h1>
          <p className="mt-1 text-sm text-gray-500">
            <Link href="/call-analyses?tab=gatekeeper" className="text-[#792990] hover:underline">
              ← Voltar para análises
            </Link>
          </p>
        </div>
        {batch.overallScore !== null && (
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-gray-500">Score Médio</p>
            <p className={`text-4xl font-black ${scoreColor}`}>{batch.overallScore}</p>
            <p className="text-xs text-gray-400">/ 5</p>
          </div>
        )}
      </div>

      {/* Status banner */}
      {batch.status !== "completed" && (
        <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
          {batch.status === "pending" && "Análise de lote aguardando processamento..."}
          {batch.status === "processing" && "Análise de lote em processamento..."}
          {batch.status === "error" && `Erro na análise: ${batch.errorMsg ?? "desconhecido"}`}
        </div>
      )}

      {/* Historical context */}
      {batch.comparisonWithHistory && (
        <div className="mb-6 rounded-lg bg-white p-5 shadow">
          <h2 className="mb-4 font-semibold text-gray-800">
            {batch.comparisonWithHistory.firstBatch ? "📊 Primeiro Lote — Linha de Base" : "📈 Comparação com Histórico"}
          </h2>
          {batch.comparisonWithHistory.firstBatch ? (
            <p className="text-sm text-gray-600">Este é o primeiro lote analisado. Os próximos lotes serão comparados com este.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-3">
              {batch.comparisonWithHistory.improved && batch.comparisonWithHistory.improved.length > 0 && (
                <div className="rounded-lg bg-green-50 p-3">
                  <p className="mb-2 text-xs font-semibold text-green-700">✓ Melhorou</p>
                  <StringList items={batch.comparisonWithHistory.improved} color="text-green-800" prefix="↑" />
                </div>
              )}
              {batch.comparisonWithHistory.worsened && batch.comparisonWithHistory.worsened.length > 0 && (
                <div className="rounded-lg bg-red-50 p-3">
                  <p className="mb-2 text-xs font-semibold text-red-700">⚠ Piorou</p>
                  <StringList items={batch.comparisonWithHistory.worsened} color="text-red-800" prefix="↓" />
                </div>
              )}
              {batch.comparisonWithHistory.unchanged && batch.comparisonWithHistory.unchanged.length > 0 && (
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="mb-2 text-xs font-semibold text-gray-600">= Estável</p>
                  <StringList items={batch.comparisonWithHistory.unchanged} color="text-gray-700" prefix="=" />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Dimension averages */}
      {batch.dimensionAverages && (
        <div className="mb-6 rounded-lg bg-white p-5 shadow">
          <h2 className="mb-4 font-semibold text-gray-800">Médias por Dimensão RAPORT</h2>
          <div className="space-y-3">
            <ScoreBar label="Recepção" score={batch.dimensionAverages.recepcao} />
            <ScoreBar label="Aliança" score={batch.dimensionAverages.alianca} />
            <ScoreBar label="Perguntas" score={batch.dimensionAverages.perguntas} />
            <ScoreBar label="Objeções" score={batch.dimensionAverages.objecoes} />
            <ScoreBar label="Resultado" score={batch.dimensionAverages.resultado} />
            <ScoreBar label="Técnicas" score={batch.dimensionAverages.tecnicas} />
          </div>
        </div>
      )}

      {/* Patterns */}
      {batch.patterns && (
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          {batch.patterns.working && batch.patterns.working.length > 0 && (
            <div className="rounded-lg bg-white p-5 shadow">
              <h3 className="mb-3 font-semibold text-green-700">✓ O que está funcionando</h3>
              <StringList items={batch.patterns.working} color="text-green-800" prefix="✓" />
            </div>
          )}
          {batch.patterns.notWorking && batch.patterns.notWorking.length > 0 && (
            <div className="rounded-lg bg-white p-5 shadow">
              <h3 className="mb-3 font-semibold text-red-700">✗ O que não está funcionando</h3>
              <StringList items={batch.patterns.notWorking} color="text-red-800" prefix="✗" />
            </div>
          )}
          {batch.patterns.keepDoing && batch.patterns.keepDoing.length > 0 && (
            <div className="rounded-lg bg-white p-5 shadow">
              <h3 className="mb-3 font-semibold text-blue-700">→ Continue fazendo</h3>
              <StringList items={batch.patterns.keepDoing} color="text-blue-800" prefix="→" />
            </div>
          )}
        </div>
      )}

      {/* Individual highlights */}
      {batch.individualHighlights && batch.individualHighlights.length > 0 && (
        <div className="mb-6 rounded-lg bg-white p-5 shadow">
          <h2 className="mb-4 font-semibold text-gray-800">Destaques por Ligação</h2>
          <div className="divide-y divide-gray-100">
            {batch.individualHighlights.map((h, i) => (
              <div key={i} className="flex items-start gap-4 py-3">
                <div className="flex-1">
                  <p className="text-sm text-gray-700">{h.highlight}</p>
                  <Link href={`/activities/${h.activityId}`} className="mt-0.5 text-xs text-[#792990] hover:underline">
                    Ver atividade
                  </Link>
                </div>
                {h.score !== undefined && (
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    h.score >= 4 ? "bg-green-100 text-green-800" : h.score >= 3 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"
                  }`}>
                    {h.score}/5
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {batch.recommendations && batch.recommendations.length > 0 && (
        <div className="mb-6 rounded-lg border-l-4 border-[#792990] bg-purple-50 p-5">
          <h2 className="mb-3 font-semibold text-[#792990]">Recomendações de Treino</h2>
          <StringList items={batch.recommendations} color="text-gray-800" prefix="→" />
        </div>
      )}

      {/* Summary for history */}
      {batch.newSummary && (
        <div className="mb-6 rounded-lg bg-white p-5 shadow">
          <h2 className="mb-2 font-semibold text-gray-800">Resumo do Lote (histórico)</h2>
          <p className="text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">{batch.newSummary}</p>
        </div>
      )}

      {/* Positivos e Melhorias */}
      {(batch.positivePoints?.length || batch.improvementPoints?.length) && (
        <div className="grid gap-4 md:grid-cols-2">
          {batch.positivePoints && batch.positivePoints.length > 0 && (
            <div className="rounded-lg bg-white p-5 shadow">
              <h3 className="mb-3 font-semibold text-green-700">Pontos Positivos do Lote</h3>
              <StringList items={batch.positivePoints} color="text-gray-700" prefix="✓" />
            </div>
          )}
          {batch.improvementPoints && batch.improvementPoints.length > 0 && (
            <div className="rounded-lg bg-white p-5 shadow">
              <h3 className="mb-3 font-semibold text-orange-700">Pontos de Melhoria do Lote</h3>
              <StringList items={batch.improvementPoints} color="text-gray-700" prefix="→" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
