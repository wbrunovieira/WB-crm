"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Zap, Pencil } from "lucide-react";
import { deleteCadenceStep } from "@/actions/cadence-steps";
import { CADENCE_CHANNEL_LABELS, type CadenceChannel } from "@/lib/validations/cadence";
import { CadenceStepEditModal } from "./CadenceStepEditModal";

type CadenceStep = {
  id: string;
  dayNumber: number;
  channel: string;
  subject: string;
  description: string | null;
  order: number;
};

type CadenceStepsListProps = {
  steps: CadenceStep[];
};

export function CadenceStepsList({ steps }: CadenceStepsListProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [editingStep, setEditingStep] = useState<CadenceStep | null>(null);

  const handleDelete = async (step: CadenceStep) => {
    if (!confirm(`Excluir etapa do dia ${step.dayNumber}?`)) return;

    setLoading(step.id);
    try {
      await deleteCadenceStep(step.id);
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao excluir");
    } finally {
      setLoading(null);
    }
  };

  const getChannelInfo = (channel: string) => {
    return CADENCE_CHANNEL_LABELS[channel as CadenceChannel] || { label: channel, icon: "📌" };
  };

  // Returns border accent color and badge styles for each channel
  const getChannelStyles = (channel: string) => {
    const styles: Record<string, { border: string; badge: string; badgeText: string }> = {
      email: {
        border: "border-l-[#792990]",
        badge: "bg-[#792990]/10",
        badgeText: "text-[#792990]",
      },
      linkedin: {
        border: "border-l-[#0A66C2]",
        badge: "bg-[#0A66C2]/10",
        badgeText: "text-[#0A66C2]",
      },
      whatsapp: {
        border: "border-l-[#25D366]",
        badge: "bg-[#25D366]/10",
        badgeText: "text-[#128C7E]",
      },
      call: {
        border: "border-l-[#5B4BA0]",
        badge: "bg-[#5B4BA0]/10",
        badgeText: "text-[#5B4BA0]",
      },
      meeting: {
        border: "border-l-[#E91E63]",
        badge: "bg-[#E91E63]/10",
        badgeText: "text-[#C2185B]",
      },
      instagram: {
        border: "border-l-[#E4405F]",
        badge: "bg-[#E4405F]/10",
        badgeText: "text-[#C13584]",
      },
    };
    return styles[channel] || {
      border: "border-l-gray-400",
      badge: "bg-gray-100",
      badgeText: "text-gray-600",
    };
  };

  if (steps.length === 0) {
    return (
      <div className="col-span-2 rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
        <Zap className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-lg font-medium text-gray-900">
          Nenhuma etapa
        </h3>
        <p className="mt-2 text-sm text-gray-500">
          Adicione etapas para criar a sequência de prospecção.
        </p>
      </div>
    );
  }

  // Group steps by day
  const stepsByDay = steps.reduce((acc, step) => {
    if (!acc[step.dayNumber]) {
      acc[step.dayNumber] = [];
    }
    acc[step.dayNumber].push(step);
    return acc;
  }, {} as Record<number, CadenceStep[]>);

  const sortedDays = Object.keys(stepsByDay)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <div className="col-span-2 space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">
        Etapas ({steps.length})
      </h2>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-[#792990]/20" />

        <div className="space-y-6">
          {sortedDays.map((day) => (
            <div key={day} className="relative flex gap-4">
              {/* Day marker */}
              <div className="relative z-10 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border-2 border-primary bg-white font-bold text-primary">
                D{day}
              </div>

              {/* Steps for this day */}
              <div className="flex-1 space-y-2 pt-1">
                {stepsByDay[day].map((step) => {
                  const channelInfo = getChannelInfo(step.channel);
                  const channelStyles = getChannelStyles(step.channel);
                  return (
                    <div
                      key={step.id}
                      className={`rounded-lg border border-gray-200 border-l-4 ${channelStyles.border} bg-white p-4 shadow-sm hover:shadow-md transition-shadow`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          {/* Channel badge */}
                          <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ${channelStyles.badge}`}>
                            <span className="text-base">{channelInfo.icon}</span>
                            <span className={`text-sm font-medium ${channelStyles.badgeText}`}>
                              {channelInfo.label}
                            </span>
                          </div>
                          {/* Subject */}
                          <p className="mt-2 font-semibold text-gray-900">
                            {step.subject}
                          </p>
                          {/* Description */}
                          {step.description && (
                            <p className="mt-1.5 text-sm text-gray-600 leading-relaxed">
                              {step.description}
                            </p>
                          )}
                        </div>
                        {/* Action buttons */}
                        <div className="flex items-center gap-1 ml-3 shrink-0">
                          <button
                            onClick={() => setEditingStep(step)}
                            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-[#792990] transition-all"
                            title="Editar etapa"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(step)}
                            disabled={loading === step.id}
                            className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30 transition-all"
                            title="Excluir etapa"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit Modal */}
      {editingStep && (
        <CadenceStepEditModal
          step={editingStep}
          isOpen={!!editingStep}
          onClose={() => setEditingStep(null)}
        />
      )}
    </div>
  );
}
