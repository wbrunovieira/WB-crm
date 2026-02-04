"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Zap,
  Play,
  Pause,
  X,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Calendar,
  Target,
} from "lucide-react";
import {
  getLeadCadences,
  pauseLeadCadence,
  resumeLeadCadence,
  cancelLeadCadence,
  completeLeadCadence,
} from "@/actions/lead-cadences";
import { ApplyCadenceModal } from "./ApplyCadenceModal";
import {
  LEAD_CADENCE_STATUS_LABELS,
  CADENCE_CHANNEL_LABELS,
  type LeadCadenceStatus,
  type CadenceChannel,
} from "@/lib/validations/cadence";
import { formatDate } from "@/lib/utils";

type LeadCadence = Awaited<ReturnType<typeof getLeadCadences>>[number];

type LeadCadenceSectionProps = {
  leadId: string;
  isConverted?: boolean;
};

export function LeadCadenceSection({ leadId, isConverted = false }: LeadCadenceSectionProps) {
  const router = useRouter();
  const [cadences, setCadences] = useState<LeadCadence[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [expandedCadence, setExpandedCadence] = useState<string | null>(null);

  useEffect(() => {
    async function loadCadences() {
      try {
        const data = await getLeadCadences(leadId);
        setCadences(data);
      } catch {
        console.error("Erro ao carregar cadências");
      } finally {
        setLoading(false);
      }
    }
    loadCadences();
  }, [leadId]);

  const handlePause = async (id: string) => {
    if (!confirm("Pausar esta cadência?")) return;
    setActionLoading(id);
    try {
      await pauseLeadCadence(id);
      const data = await getLeadCadences(leadId);
      setCadences(data);
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao pausar");
    } finally {
      setActionLoading(null);
    }
  };

  const handleResume = async (id: string) => {
    if (!confirm("Retomar esta cadência? As datas das atividades pendentes serão ajustadas.")) return;
    setActionLoading(id);
    try {
      await resumeLeadCadence(id);
      const data = await getLeadCadences(leadId);
      setCadences(data);
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao retomar");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm("Cancelar esta cadência? Esta ação não pode ser desfeita.")) return;
    setActionLoading(id);
    try {
      await cancelLeadCadence(id);
      const data = await getLeadCadences(leadId);
      setCadences(data);
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao cancelar");
    } finally {
      setActionLoading(null);
    }
  };

  const handleComplete = async (id: string) => {
    if (!confirm("Marcar cadência como concluída?")) return;
    setActionLoading(id);
    try {
      await completeLeadCadence(id);
      const data = await getLeadCadences(leadId);
      setCadences(data);
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao completar");
    } finally {
      setActionLoading(null);
    }
  };

  const handleApplySuccess = async () => {
    setShowModal(false);
    const data = await getLeadCadences(leadId);
    setCadences(data);
    router.refresh();
  };

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      active: "bg-green-100 text-green-700 border-green-200",
      paused: "bg-yellow-100 text-yellow-700 border-yellow-200",
      completed: "bg-blue-100 text-blue-700 border-blue-200",
      cancelled: "bg-gray-100 text-gray-700 border-gray-200",
    };
    return colors[status] || "bg-gray-100 text-gray-700 border-gray-200";
  };

  const getChannelColor = (channel: string): string => {
    const colors: Record<string, string> = {
      email: "bg-green-50 border-green-200 text-green-700",
      linkedin: "bg-indigo-50 border-indigo-200 text-indigo-700",
      whatsapp: "bg-emerald-50 border-emerald-200 text-emerald-700",
      call: "bg-blue-50 border-blue-200 text-blue-700",
      meeting: "bg-purple-50 border-purple-200 text-purple-700",
      instagram: "bg-pink-50 border-pink-200 text-pink-700",
    };
    return colors[channel] || "bg-gray-50 border-gray-200 text-gray-700";
  };

  if (loading) {
    return (
      <div className="mt-6 rounded-xl bg-white p-6 shadow-md">
        <div className="animate-pulse">
          <div className="h-6 w-48 bg-gray-200 rounded mb-4"></div>
          <div className="h-24 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mt-6 rounded-xl bg-white p-6 shadow-md hover:shadow-lg transition-shadow duration-200">
        <div className="flex items-center justify-between mb-5 pb-3 border-b-2 border-gray-100">
          <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900">
            <Zap className="h-6 w-6 text-primary" />
            Cadências de Prospecção
          </h2>
          {!isConverted && (
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
            >
              <Zap className="h-4 w-4" />
              Aplicar Cadência
            </button>
          )}
        </div>

        {cadences.length === 0 ? (
          <div className="text-center py-8">
            <Zap className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-4 text-gray-500">
              Nenhuma cadência aplicada a este lead.
            </p>
            {!isConverted && (
              <button
                onClick={() => setShowModal(true)}
                className="mt-4 text-primary hover:underline font-medium"
              >
                Aplicar primeira cadência
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {cadences.map((lc) => (
              <div
                key={lc.id}
                className="rounded-lg border bg-gray-50 overflow-hidden"
              >
                {/* Header */}
                <div className="p-4 bg-white border-b">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-gray-900">
                          {lc.cadence.name}
                        </h3>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium border ${getStatusColor(lc.status)}`}
                        >
                          {LEAD_CADENCE_STATUS_LABELS[lc.status as LeadCadenceStatus] || lc.status}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Início: {formatDate(lc.startDate)}
                        </span>
                        {lc.cadence.icp && (
                          <span className="flex items-center gap-1">
                            <Target className="h-4 w-4" />
                            {lc.cadence.icp.name}
                          </span>
                        )}
                        <span>
                          {lc.cadence.durationDays} dias
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-gray-600">Progresso</span>
                          <span className="font-medium text-gray-900">
                            {lc.completedSteps}/{lc.totalSteps} ({lc.progress}%)
                          </span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all duration-300"
                            style={{ width: `${lc.progress}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    {lc.status === "active" && (
                      <div className="ml-4 flex gap-2">
                        <button
                          onClick={() => handlePause(lc.id)}
                          disabled={actionLoading === lc.id}
                          className="p-2 rounded-lg text-yellow-600 hover:bg-yellow-50 disabled:opacity-50"
                          title="Pausar"
                        >
                          <Pause className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleComplete(lc.id)}
                          disabled={actionLoading === lc.id}
                          className="p-2 rounded-lg text-green-600 hover:bg-green-50 disabled:opacity-50"
                          title="Marcar como concluída"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleCancel(lc.id)}
                          disabled={actionLoading === lc.id}
                          className="p-2 rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-50"
                          title="Cancelar"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                    {lc.status === "paused" && (
                      <div className="ml-4 flex gap-2">
                        <button
                          onClick={() => handleResume(lc.id)}
                          disabled={actionLoading === lc.id}
                          className="p-2 rounded-lg text-green-600 hover:bg-green-50 disabled:opacity-50"
                          title="Retomar"
                        >
                          <Play className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleCancel(lc.id)}
                          disabled={actionLoading === lc.id}
                          className="p-2 rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-50"
                          title="Cancelar"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Expand/Collapse Button */}
                  <button
                    onClick={() =>
                      setExpandedCadence(expandedCadence === lc.id ? null : lc.id)
                    }
                    className="mt-3 flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    {expandedCadence === lc.id ? (
                      <>
                        <ChevronUp className="h-4 w-4" />
                        Ocultar atividades
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4" />
                        Ver atividades ({lc.activities.length})
                      </>
                    )}
                  </button>
                </div>

                {/* Expanded Activities */}
                {expandedCadence === lc.id && (
                  <div className="p-4 space-y-2">
                    {lc.activities.map((activity) => {
                      const channelInfo = CADENCE_CHANNEL_LABELS[activity.cadenceStep.channel as CadenceChannel];
                      return (
                        <div
                          key={activity.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border ${
                            activity.activity.completed
                              ? "bg-green-50 border-green-200"
                              : getChannelColor(activity.cadenceStep.channel)
                          }`}
                        >
                          <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-white border font-bold text-sm">
                            D{activity.cadenceStep.dayNumber}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{channelInfo?.icon || "📌"}</span>
                              <span className="font-medium text-gray-900">
                                {channelInfo?.label || activity.cadenceStep.channel}
                              </span>
                              {activity.activity.completed && (
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                              )}
                            </div>
                            <p className="text-sm text-gray-600 truncate">
                              {activity.activity.subject}
                            </p>
                          </div>
                          <div className="text-sm text-gray-500">
                            {formatDate(activity.activity.dueDate)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <ApplyCadenceModal
          leadId={leadId}
          onClose={() => setShowModal(false)}
          onSuccess={handleApplySuccess}
        />
      )}
    </>
  );
}
