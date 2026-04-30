import { backendFetch } from "@/lib/backend/client";
import type { CallAnalysis, SpicedDimension, MicroPacto, SchedulingTechniques } from "@/types/call-analysis";
import { notFound } from "next/navigation";
import Link from "next/link";
import BackButton from "@/components/ui/BackButton";

function ScoreBar({ score }: { score: number }) {
  const color = score >= 80 ? "bg-green-500" : score >= 50 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="mt-1 flex items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-sm font-semibold">{score}/100</span>
    </div>
  );
}

function SpicedCard({ label, dimension }: { label: string; dimension: SpicedDimension | null }) {
  if (!dimension) return null;
  const color =
    dimension.score >= 80
      ? "border-green-400"
      : dimension.score >= 50
        ? "border-yellow-400"
        : "border-red-400";

  return (
    <div className={`rounded-lg border-l-4 bg-white p-5 shadow ${color}`}>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">{label}</h3>
        <span className="text-sm font-bold text-gray-600">{dimension.score}/100</span>
      </div>
      <ScoreBar score={dimension.score} />
      <p className="mt-3 text-sm text-gray-700 leading-relaxed">{dimension.text}</p>
      {dimension.highlights && dimension.highlights.length > 0 && (
        <ul className="mt-2 space-y-1">
          {dimension.highlights.map((h, i) => (
            <li key={i} className="flex items-start gap-1.5 text-xs text-gray-600">
              <span className="mt-0.5 text-primary">•</span>
              {h}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const TECHNIQUE_LABELS: Record<string, string> = {
  gatilhoDor: "Gatilho da Dor",
  escolhaAlternativa: "Escolha Alternativa",
  compromissoVerbalShow: "Compromisso Verbal (Show)",
  compromissoEmergencia: "Compromisso de Emergência",
};

function MicroPactosList({ pactos }: { pactos: MicroPacto[] | null }) {
  if (!pactos || pactos.length === 0) return null;
  const achieved = pactos.filter((p) => p.achieved).length;

  return (
    <div className="rounded-lg bg-white p-5 shadow">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">Micro-pactos Implícitos</h3>
        <span className="text-sm font-semibold text-gray-600">
          {achieved}/{pactos.length} atingidos
        </span>
      </div>
      <div className="mt-4 space-y-2">
        {pactos.map((p) => (
          <div
            key={p.id}
            className={`flex items-start gap-3 rounded-lg p-3 ${p.achieved ? "bg-green-50" : "bg-red-50"}`}
          >
            <span className={`mt-0.5 text-lg ${p.achieved ? "text-green-600" : "text-red-500"}`}>
              {p.achieved ? "✓" : "✗"}
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {p.spicedDimension} — {p.label}
              </p>
              <p className="text-sm text-gray-700">{p.notes}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SchedulingTechniquesList({ techniques }: { techniques: SchedulingTechniques | null }) {
  if (!techniques) return null;
  const entries = Object.entries(techniques);
  if (entries.length === 0) return null;
  const applied = entries.filter(([, v]) => v.used).length;

  return (
    <div className="rounded-lg bg-white p-5 shadow">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">Técnicas de Agendamento</h3>
        <span className="text-sm font-semibold text-gray-600">
          {applied}/{entries.length} aplicadas
        </span>
      </div>
      <div className="mt-4 space-y-2">
        {entries.map(([key, val]) => (
          <div
            key={key}
            className={`flex items-start gap-3 rounded-lg p-3 ${val.used ? "bg-green-50" : "bg-gray-50"}`}
          >
            <span className={`mt-0.5 text-lg ${val.used ? "text-green-600" : "text-gray-400"}`}>
              {val.used ? "✓" : "○"}
            </span>
            <div>
              <p className="text-sm font-medium text-gray-700">
                {TECHNIQUE_LABELS[key] ?? key}
              </p>
              {val.notes && (
                <p className="text-xs text-gray-500">{val.notes}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RiskBadge({ risk }: { risk: string | null }) {
  if (!risk) return null;
  const color =
    risk === "BAIXO"
      ? "bg-green-100 text-green-800 border-green-300"
      : risk === "MÉDIO"
        ? "bg-yellow-100 text-yellow-800 border-yellow-300"
        : "bg-red-100 text-red-800 border-red-300";
  return (
    <span className={`rounded-full border px-3 py-1 text-sm font-semibold ${color}`}>
      Risco No-Show: {risk}
    </span>
  );
}

export default async function CallAnalysisDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const analysis = await backendFetch<CallAnalysis>(`/call-analysis/${params.id}`).catch(() => null);

  if (!analysis) notFound();

  const totalScore = analysis.score ?? 0;
  const scoreColor =
    totalScore >= 80 ? "text-green-600" : totalScore >= 50 ? "text-yellow-600" : "text-red-600";

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center gap-3">
        <BackButton />
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Análise SPICED</h1>
            {analysis.noShowRisk && <RiskBadge risk={analysis.noShowRisk} />}
          </div>
          <p className="mt-1 text-sm text-gray-500">
            <Link href={`/activities/${analysis.activityId}`} className="text-primary hover:underline">
              Ver atividade da ligação
            </Link>
          </p>
        </div>
        {analysis.score !== null && (
          <div className="text-right">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Score Geral</p>
            <p className={`text-4xl font-black ${scoreColor}`}>{totalScore}</p>
            <p className="text-xs text-gray-400">/ 100</p>
          </div>
        )}
      </div>

      {analysis.status !== "completed" && (
        <div className="mb-6 rounded-lg bg-yellow-50 border border-yellow-200 p-4 text-sm text-yellow-800">
          {analysis.status === "pending" && "Análise aguardando processamento..."}
          {analysis.status === "processing" && "Análise em processamento..."}
          {analysis.status === "error" && `Erro na análise: ${analysis.errorMsg ?? "desconhecido"}`}
        </div>
      )}

      {analysis.summary && (
        <div className="mb-6 rounded-lg bg-white p-5 shadow">
          <h2 className="mb-2 font-semibold text-gray-800">Resumo Executivo</h2>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
            {analysis.summary}
          </p>
        </div>
      )}

      {analysis.noShowRiskText && (
        <div className="mb-6 rounded-lg bg-white p-5 shadow">
          <h2 className="mb-2 font-semibold text-gray-800">Análise de Risco</h2>
          <p className="text-sm text-gray-700 leading-relaxed">{analysis.noShowRiskText}</p>
        </div>
      )}

      {/* SPICED Grid */}
      <h2 className="mb-3 text-lg font-bold text-gray-800">Dimensões SPICED</h2>
      <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <SpicedCard label="S — Situação" dimension={analysis.spicedSituation} />
        <SpicedCard label="P — Dor" dimension={analysis.spicedPain} />
        <SpicedCard label="I — Impacto" dimension={analysis.spicedImpact} />
        <SpicedCard label="C — Evento Crítico" dimension={analysis.spicedCritical} />
        <SpicedCard label="E — Evidência" dimension={analysis.spicedEvidence} />
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <MicroPactosList pactos={analysis.microPactos} />
        <SchedulingTechniquesList techniques={analysis.schedulingTechniques} />
      </div>

      {(analysis.positivePoints?.length || analysis.improvementPoints?.length) && (
        <div className="mb-6 grid gap-4 md:grid-cols-2">
          {analysis.positivePoints && analysis.positivePoints.length > 0 && (
            <div className="rounded-lg bg-white p-5 shadow">
              <h3 className="mb-3 font-semibold text-green-700">Pontos Positivos</h3>
              <ul className="space-y-2">
                {analysis.positivePoints.map((p, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-green-500 mt-0.5">✓</span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {analysis.improvementPoints && analysis.improvementPoints.length > 0 && (
            <div className="rounded-lg bg-white p-5 shadow">
              <h3 className="mb-3 font-semibold text-orange-700">Pontos de Melhoria</h3>
              <ul className="space-y-2">
                {analysis.improvementPoints.map((p, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-orange-500 mt-0.5">→</span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {analysis.microAnalysis && analysis.microAnalysis.length > 0 && (
        <div className="rounded-lg bg-white p-5 shadow">
          <h3 className="mb-3 font-semibold text-gray-800">Análise por Momentos</h3>
          <div className="space-y-3">
            {analysis.microAnalysis.map((entry, i) => (
              <div
                key={i}
                className={`rounded-lg p-3 border-l-4 ${
                  entry.impact === "positive"
                    ? "border-green-400 bg-green-50"
                    : entry.impact === "negative"
                      ? "border-red-400 bg-red-50"
                      : "border-gray-300 bg-gray-50"
                }`}
              >
                <p className="text-xs font-semibold text-gray-500 uppercase">{entry.moment}</p>
                <p className="mt-1 text-sm text-gray-700">{entry.observation}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
