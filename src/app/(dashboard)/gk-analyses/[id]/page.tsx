import { backendFetch } from "@/lib/backend/client";
import { notFound } from "next/navigation";
import Link from "next/link";
import BackButton from "@/components/ui/BackButton";

interface RaportDimension {
  text?: string;
  score?: number;
  usedGKName?: boolean;
  connectionMoments?: string[];
  questionsAsked?: string[];
  objectionsReceived?: string[];
  responsesGiven?: string[];
  outcome?: string;
  obtained?: string[];
  nextAttemptTip?: string;
  techniquesUsed?: string[];
}

interface GkAnalysis {
  id: string;
  activityId: string;
  score: number | null;
  summary: string | null;
  status: string;
  errorMsg: string | null;
  raportRecepcao: RaportDimension | null;
  raportAlianca: RaportDimension | null;
  raportPerguntas: RaportDimension | null;
  raportObjecoes: RaportDimension | null;
  raportResultado: RaportDimension | null;
  raportTecnicas: RaportDimension | null;
  positivePoints: string[] | null;
  improvementPoints: string[] | null;
}

function DimScore({ score }: { score?: number }) {
  if (score === undefined) return null;
  const color = score >= 4 ? "text-green-600" : score >= 3 ? "text-yellow-600" : "text-red-500";
  return <span className={`font-bold text-sm ${color}`}>{score}/5</span>;
}

function RaportCard({
  title,
  emoji,
  dim,
  children,
}: {
  title: string;
  emoji: string;
  dim: RaportDimension | null;
  children?: React.ReactNode;
}) {
  if (!dim) return null;
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">
          {emoji} {title}
        </h3>
        <DimScore score={dim.score} />
      </div>
      {dim.text && <p className="mb-3 text-sm leading-relaxed text-gray-700">{dim.text}</p>}
      {children}
    </div>
  );
}

function StringList({ items, color = "text-gray-700", prefix = "•" }: { items?: string[]; color?: string; prefix?: string }) {
  if (!items?.length) return null;
  return (
    <ul className="space-y-1">
      {items.map((item, i) => (
        <li key={i} className={`flex items-start gap-1.5 text-xs ${color}`}>
          <span className="mt-0.5 flex-shrink-0">{prefix}</span>{item}
        </li>
      ))}
    </ul>
  );
}

function OutcomeBadge({ outcome }: { outcome?: string }) {
  if (!outcome) return null;
  const cfg: Record<string, string> = {
    got_name: "bg-green-100 text-green-800",
    got_transfer: "bg-emerald-100 text-emerald-800",
    scheduled: "bg-blue-100 text-blue-800",
    no_outcome: "bg-gray-100 text-gray-700",
  };
  const label: Record<string, string> = {
    got_name: "Obteve nome",
    got_transfer: "Conseguiu transferência",
    scheduled: "Agendou",
    no_outcome: "Sem resultado",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${cfg[outcome] ?? "bg-gray-100 text-gray-700"}`}>
      {label[outcome] ?? outcome}
    </span>
  );
}

export default async function GkAnalysisDetailPage({ params }: { params: { id: string } }) {
  const analysis = await backendFetch<GkAnalysis>(`/gatekeeper-analysis/${params.id}`).catch(() => null);
  if (!analysis) notFound();

  const scoreColor =
    (analysis.score ?? 0) >= 4 ? "text-green-600"
    : (analysis.score ?? 0) >= 3 ? "text-yellow-600"
    : "text-red-600";

  return (
    <div className="mx-auto max-w-5xl p-8">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <BackButton />
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Análise RAPORT — Gatekeeper</h1>
          <p className="mt-1 text-sm text-gray-500">
            <Link href={`/activities/${analysis.activityId}`} className="text-[#792990] hover:underline">
              Ver atividade da ligação
            </Link>
          </p>
        </div>
        {analysis.score !== null && (
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-gray-500">Score RAPORT</p>
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
          <h2 className="mb-2 font-semibold text-gray-800">Resumo da Ligação</h2>
          <p className="text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">{analysis.summary}</p>
        </div>
      )}

      {/* RAPORT dimensions */}
      <h2 className="mb-3 text-lg font-bold text-gray-800">Dimensões RAPORT</h2>
      <div className="mb-6 grid gap-4 md:grid-cols-2">

        <RaportCard title="Recepção" emoji="📞" dim={analysis.raportRecepcao} />

        <RaportCard title="Aliança com GK" emoji="🤝" dim={analysis.raportAlianca}>
          {analysis.raportAlianca?.usedGKName !== undefined && (
            <div className={`mb-2 flex items-center gap-2 rounded p-2 ${analysis.raportAlianca.usedGKName ? "bg-green-50" : "bg-gray-50"}`}>
              <span className={analysis.raportAlianca.usedGKName ? "text-green-600" : "text-gray-400"}>
                {analysis.raportAlianca.usedGKName ? "✓" : "○"}
              </span>
              <span className="text-xs text-gray-700">Usou o nome do GK</span>
            </div>
          )}
          {analysis.raportAlianca?.connectionMoments && (
            <div className="mt-2">
              <p className="mb-1 text-xs font-semibold text-gray-600">Momentos de conexão:</p>
              <StringList items={analysis.raportAlianca.connectionMoments} color="text-green-700" prefix="✓" />
            </div>
          )}
        </RaportCard>

        <RaportCard title="Perguntas Empoderadoras" emoji="❓" dim={analysis.raportPerguntas}>
          {analysis.raportPerguntas?.questionsAsked && (
            <div className="mt-2">
              <p className="mb-1 text-xs font-semibold text-gray-600">Perguntas feitas:</p>
              <StringList items={analysis.raportPerguntas.questionsAsked} color="text-blue-700" prefix="?" />
            </div>
          )}
        </RaportCard>

        <RaportCard title="Objeções" emoji="🛡" dim={analysis.raportObjecoes}>
          {analysis.raportObjecoes?.objectionsReceived && (
            <div className="mt-2">
              <p className="mb-1 text-xs font-semibold text-gray-600">Objeções recebidas:</p>
              <StringList items={analysis.raportObjecoes.objectionsReceived} color="text-red-700" prefix="⚠" />
            </div>
          )}
          {analysis.raportObjecoes?.responsesGiven && (
            <div className="mt-2">
              <p className="mb-1 text-xs font-semibold text-gray-600">Respostas dadas:</p>
              <StringList items={analysis.raportObjecoes.responsesGiven} color="text-gray-700" prefix="→" />
            </div>
          )}
        </RaportCard>

        <RaportCard title="Resultado" emoji="🎯" dim={analysis.raportResultado}>
          {analysis.raportResultado?.outcome && (
            <div className="mb-2">
              <OutcomeBadge outcome={analysis.raportResultado.outcome} />
            </div>
          )}
          {analysis.raportResultado?.obtained && (
            <div className="mt-2">
              <p className="mb-1 text-xs font-semibold text-gray-600">Informações obtidas:</p>
              <StringList items={analysis.raportResultado.obtained} color="text-emerald-700" prefix="✓" />
            </div>
          )}
          {analysis.raportResultado?.nextAttemptTip && (
            <div className="mt-3 rounded border-l-4 border-[#792990] bg-purple-50 p-2">
              <p className="text-xs font-semibold text-[#792990]">Dica para próxima tentativa</p>
              <p className="mt-0.5 text-xs text-gray-700">{analysis.raportResultado.nextAttemptTip}</p>
            </div>
          )}
        </RaportCard>

        <RaportCard title="Técnicas Utilizadas" emoji="🛠" dim={analysis.raportTecnicas}>
          {analysis.raportTecnicas?.techniquesUsed && (
            <div className="mt-2">
              <StringList items={analysis.raportTecnicas.techniquesUsed} color="text-purple-700" prefix="✓" />
            </div>
          )}
        </RaportCard>
      </div>

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
