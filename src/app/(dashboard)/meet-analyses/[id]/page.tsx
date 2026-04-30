import { backendFetch } from "@/lib/backend/client";
import { notFound } from "next/navigation";
import Link from "next/link";
import BackButton from "@/components/ui/BackButton";

interface DiagGapEntry {
  identified: boolean;
  text: string | null;
  severity: "high" | "medium" | "low" | null;
}

interface DiagDimension {
  text?: string;
  score?: number;
}

interface MeetAnalysis {
  id: string;
  activityId: string;
  leadId: string | null;
  score: number | null;
  summary: string | null;
  nextStep: string | null;
  status: string;
  errorMsg: string | null;
  diagBusiness: (DiagDimension & {
    currentRevenue?: string;
    model?: string;
    customers?: string;
    averageTicket?: string;
    objective?: string;
    alreadyTried?: string;
  }) | null;
  diagGaps: (DiagDimension & {
    aquisicao?: DiagGapEntry;
    funil?: DiagGapEntry;
    oferta?: DiagGapEntry;
    timeComercial?: DiagGapEntry;
    retencao?: DiagGapEntry;
    dados?: DiagGapEntry;
  }) | null;
  diagUrgency: (DiagDimension & {
    trigger?: string;
    criticalEvent?: string;
    consequence?: string;
  }) | null;
  diagDecisionPower: (DiagDimension & {
    decisionMaker?: string;
    buyingProcess?: string;
    budget?: string;
  }) | null;
  diagEngagement: (DiagDimension & {
    level?: "high" | "medium" | "low";
    buyerQuestions?: string[];
    resistances?: string[];
    rapport?: string;
  }) | null;
  diagClosing: (DiagDimension & {
    buyerSignals?: string[];
    sellerCloses?: {
      trialClose?: { used: boolean; notes: string | null };
      nextStepAnchor?: { used: boolean; notes: string | null };
      urgencyCreation?: { used: boolean; notes: string | null };
    };
    closingProbability?: number;
  }) | null;
  positivePoints: string[] | null;
  improvementPoints: string[] | null;
}

function ScoreStars({ score }: { score: number }) {
  const color = score >= 4 ? "text-green-600" : score >= 3 ? "text-yellow-600" : "text-red-500";
  return (
    <span className={`font-bold ${color}`}>{score}/5</span>
  );
}

function SeverityBadge({ severity }: { severity: "high" | "medium" | "low" | null }) {
  if (!severity) return null;
  const cfg = {
    high:   "bg-red-100 text-red-700",
    medium: "bg-yellow-100 text-yellow-700",
    low:    "bg-green-100 text-green-700",
  }[severity];
  const label = { high: "Alta", medium: "Média", low: "Baixa" }[severity];
  return <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${cfg}`}>{label}</span>;
}

function DiagCard({ title, score, children }: { title: string; score?: number; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">{title}</h3>
        {score !== undefined && <ScoreStars score={score} />}
      </div>
      {children}
    </div>
  );
}

function GapRow({ label, gap }: { label: string; gap?: DiagGapEntry }) {
  if (!gap) return null;
  return (
    <div className={`flex items-start gap-3 rounded-lg p-2.5 ${gap.identified ? "bg-red-50" : "bg-gray-50"}`}>
      <span className={`mt-0.5 text-base ${gap.identified ? "text-red-500" : "text-gray-300"}`}>
        {gap.identified ? "⚠" : "○"}
      </span>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold text-gray-700">{label}</p>
          {gap.identified && <SeverityBadge severity={gap.severity} />}
        </div>
        {gap.text && <p className="mt-0.5 text-xs text-gray-600">{gap.text}</p>}
      </div>
    </div>
  );
}

function ClosingBar({ probability }: { probability: number }) {
  const color = probability >= 70 ? "bg-green-500" : probability >= 40 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="mt-2 flex items-center gap-3">
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-200">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${probability}%` }} />
      </div>
      <span className="text-sm font-bold text-gray-700">{probability}%</span>
    </div>
  );
}

function EngagementBadge({ level }: { level?: "high" | "medium" | "low" }) {
  if (!level) return null;
  const cfg = {
    high:   "bg-green-100 text-green-700",
    medium: "bg-yellow-100 text-yellow-700",
    low:    "bg-red-100 text-red-700",
  }[level];
  const label = { high: "Alto", medium: "Médio", low: "Baixo" }[level];
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg}`}>{label}</span>;
}

export default async function MeetAnalysisDetailPage({ params }: { params: { id: string } }) {
  const analysis = await backendFetch<MeetAnalysis>(`/meet-analysis/${params.id}`).catch(() => null);
  if (!analysis) notFound();

  const scoreColor =
    (analysis.score ?? 0) >= 4 ? "text-green-600"
    : (analysis.score ?? 0) >= 3 ? "text-yellow-600"
    : "text-red-600";

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <BackButton />
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Análise DIAG — Reunião</h1>
          <p className="mt-1 text-sm text-gray-500">
            <Link href={`/activities/${analysis.activityId}`} className="text-[#792990] hover:underline">
              Ver atividade da reunião
            </Link>
          </p>
        </div>
        {analysis.score !== null && (
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-gray-500">Score de Fit</p>
            <p className={`text-4xl font-black ${scoreColor}`}>{analysis.score}</p>
            <p className="text-xs text-gray-400">/ 5</p>
          </div>
        )}
      </div>

      {/* Status banner */}
      {analysis.status !== "completed" && (
        <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
          {analysis.status === "pending" && "Análise aguardando processamento pelo agente..."}
          {analysis.status === "processing" && "Análise em processamento..."}
          {analysis.status === "error" && `Erro na análise: ${analysis.errorMsg ?? "desconhecido"}`}
        </div>
      )}

      {/* Summary */}
      {analysis.summary && (
        <div className="mb-6 rounded-lg bg-white p-5 shadow">
          <h2 className="mb-2 font-semibold text-gray-800">Resumo Executivo</h2>
          <p className="text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">{analysis.summary}</p>
        </div>
      )}

      {/* Next step */}
      {analysis.nextStep && (
        <div className="mb-6 rounded-lg border-l-4 border-[#792990] bg-purple-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#792990]">Próximo Passo</p>
          <p className="mt-1 text-sm text-gray-800">{analysis.nextStep}</p>
        </div>
      )}

      {/* DIAG Grid */}
      <h2 className="mb-3 text-lg font-bold text-gray-800">Dimensões DIAG</h2>
      <div className="mb-6 grid gap-4 md:grid-cols-2">

        {/* D — Negócio */}
        {analysis.diagBusiness && (
          <DiagCard title="D — Diagnóstico do Negócio" score={analysis.diagBusiness.score}>
            <dl className="space-y-1.5 text-sm">
              {analysis.diagBusiness.currentRevenue && <div><span className="text-gray-500">Receita: </span><span className="text-gray-800">{analysis.diagBusiness.currentRevenue}</span></div>}
              {analysis.diagBusiness.model && <div><span className="text-gray-500">Modelo: </span><span className="text-gray-800">{analysis.diagBusiness.model}</span></div>}
              {analysis.diagBusiness.customers && <div><span className="text-gray-500">Clientes: </span><span className="text-gray-800">{analysis.diagBusiness.customers}</span></div>}
              {analysis.diagBusiness.averageTicket && <div><span className="text-gray-500">Ticket médio: </span><span className="text-gray-800">{analysis.diagBusiness.averageTicket}</span></div>}
              {analysis.diagBusiness.objective && <div><span className="text-gray-500">Objetivo: </span><span className="text-gray-800">{analysis.diagBusiness.objective}</span></div>}
              {analysis.diagBusiness.alreadyTried && <div className="mt-2 rounded bg-gray-50 p-2"><span className="text-xs text-gray-500">O que já tentou: </span><span className="text-xs text-gray-700">{analysis.diagBusiness.alreadyTried}</span></div>}
            </dl>
            {analysis.diagBusiness.text && <p className="mt-3 text-xs leading-relaxed text-gray-600 italic">{analysis.diagBusiness.text}</p>}
          </DiagCard>
        )}

        {/* U — Urgência */}
        {analysis.diagUrgency && (
          <DiagCard title="U — Urgência e Timing" score={analysis.diagUrgency.score}>
            <dl className="space-y-2 text-sm">
              {analysis.diagUrgency.trigger && <div><span className="text-gray-500">Por que agora: </span><span className="font-medium text-gray-800">{analysis.diagUrgency.trigger}</span></div>}
              {analysis.diagUrgency.criticalEvent && <div><span className="text-gray-500">Evento crítico: </span><span className="text-gray-800">{analysis.diagUrgency.criticalEvent}</span></div>}
              {analysis.diagUrgency.consequence && <div><span className="text-gray-500">Consequência de não agir: </span><span className="text-red-700">{analysis.diagUrgency.consequence}</span></div>}
            </dl>
            {analysis.diagUrgency.text && <p className="mt-3 text-xs leading-relaxed text-gray-600 italic">{analysis.diagUrgency.text}</p>}
          </DiagCard>
        )}

        {/* P — Poder de Decisão */}
        {analysis.diagDecisionPower && (
          <DiagCard title="P — Poder de Decisão" score={analysis.diagDecisionPower.score}>
            <dl className="space-y-2 text-sm">
              {analysis.diagDecisionPower.decisionMaker && <div><span className="text-gray-500">Quem decide: </span><span className="font-medium text-gray-800">{analysis.diagDecisionPower.decisionMaker}</span></div>}
              {analysis.diagDecisionPower.buyingProcess && <div><span className="text-gray-500">Processo de compra: </span><span className="text-gray-800">{analysis.diagDecisionPower.buyingProcess}</span></div>}
              {analysis.diagDecisionPower.budget && <div><span className="text-gray-500">Orçamento: </span><span className="text-gray-800">{analysis.diagDecisionPower.budget}</span></div>}
            </dl>
            {analysis.diagDecisionPower.text && <p className="mt-3 text-xs leading-relaxed text-gray-600 italic">{analysis.diagDecisionPower.text}</p>}
          </DiagCard>
        )}

        {/* E — Engajamento */}
        {analysis.diagEngagement && (
          <DiagCard title="E — Engajamento e Clima" score={analysis.diagEngagement.score}>
            <div className="mb-3 flex items-center gap-2">
              <span className="text-sm text-gray-500">Nível:</span>
              <EngagementBadge level={analysis.diagEngagement.level} />
            </div>
            {analysis.diagEngagement.buyerQuestions && analysis.diagEngagement.buyerQuestions.length > 0 && (
              <div className="mb-2">
                <p className="mb-1 text-xs font-semibold text-gray-600">Perguntas do cliente:</p>
                <ul className="space-y-1">
                  {analysis.diagEngagement.buyerQuestions.map((q, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-gray-700"><span className="text-[#792990]">?</span>{q}</li>
                  ))}
                </ul>
              </div>
            )}
            {analysis.diagEngagement.resistances && analysis.diagEngagement.resistances.length > 0 && (
              <div className="mb-2">
                <p className="mb-1 text-xs font-semibold text-gray-600">Resistências:</p>
                <ul className="space-y-1">
                  {analysis.diagEngagement.resistances.map((r, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-red-700"><span>⚠</span>{r}</li>
                  ))}
                </ul>
              </div>
            )}
            {analysis.diagEngagement.rapport && <p className="text-xs text-gray-600 italic">{analysis.diagEngagement.rapport}</p>}
          </DiagCard>
        )}
      </div>

      {/* Gargalos — linha inteira */}
      {analysis.diagGaps && (
        <div className="mb-6">
          <DiagCard title="G — Gargalos nas 6 Áreas de Crescimento" score={analysis.diagGaps.score}>
            <div className="grid gap-2 sm:grid-cols-2">
              <GapRow label="Aquisição" gap={analysis.diagGaps.aquisicao} />
              <GapRow label="Funil de Vendas" gap={analysis.diagGaps.funil} />
              <GapRow label="Oferta" gap={analysis.diagGaps.oferta} />
              <GapRow label="Time Comercial" gap={analysis.diagGaps.timeComercial} />
              <GapRow label="Retenção / Reativação" gap={analysis.diagGaps.retencao} />
              <GapRow label="Dados e Decisão" gap={analysis.diagGaps.dados} />
            </div>
            {analysis.diagGaps.text && <p className="mt-3 text-xs leading-relaxed text-gray-600 italic">{analysis.diagGaps.text}</p>}
          </DiagCard>
        </div>
      )}

      {/* Momentum de Fechamento */}
      {analysis.diagClosing && (
        <div className="mb-6">
          <DiagCard title="F — Momentum de Fechamento" score={analysis.diagClosing.score}>
            {analysis.diagClosing.closingProbability !== undefined && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-600">Probabilidade de Fechamento</p>
                <ClosingBar probability={analysis.diagClosing.closingProbability} />
              </div>
            )}

            {analysis.diagClosing.buyerSignals && analysis.diagClosing.buyerSignals.length > 0 && (
              <div className="mb-4">
                <p className="mb-2 text-xs font-semibold text-gray-600">Sinais de Compra do Cliente</p>
                <ul className="space-y-1">
                  {analysis.diagClosing.buyerSignals.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-green-500 mt-0.5">✓</span>{s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {analysis.diagClosing.sellerCloses && (
              <div>
                <p className="mb-2 text-xs font-semibold text-gray-600">Técnicas de Fechamento do Vendedor</p>
                <div className="space-y-2">
                  {[
                    { key: "trialClose", label: "Trial Close" },
                    { key: "nextStepAnchor", label: "Âncora de Próximo Passo" },
                    { key: "urgencyCreation", label: "Criação de Urgência" },
                  ].map(({ key, label }) => {
                    const entry = analysis.diagClosing!.sellerCloses?.[key as keyof typeof analysis.diagClosing.sellerCloses];
                    if (!entry) return null;
                    return (
                      <div key={key} className={`flex items-start gap-2 rounded p-2 ${entry.used ? "bg-green-50" : "bg-gray-50"}`}>
                        <span className={`text-base ${entry.used ? "text-green-600" : "text-gray-300"}`}>{entry.used ? "✓" : "○"}</span>
                        <div>
                          <p className="text-xs font-medium text-gray-700">{label}</p>
                          {entry.notes && <p className="text-xs text-gray-500">{entry.notes}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {analysis.diagClosing.text && <p className="mt-3 text-xs leading-relaxed text-gray-600 italic">{analysis.diagClosing.text}</p>}
          </DiagCard>
        </div>
      )}

      {/* Positivos e Melhorias */}
      {(analysis.positivePoints?.length || analysis.improvementPoints?.length) && (
        <div className="grid gap-4 md:grid-cols-2">
          {analysis.positivePoints && analysis.positivePoints.length > 0 && (
            <div className="rounded-lg bg-white p-5 shadow">
              <h3 className="mb-3 font-semibold text-green-700">Pontos Positivos</h3>
              <ul className="space-y-2">
                {analysis.positivePoints.map((p, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="mt-0.5 text-green-500">✓</span>{p}
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
                    <span className="mt-0.5 text-orange-500">→</span>{p}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
