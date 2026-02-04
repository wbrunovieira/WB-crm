"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Zap } from "lucide-react";
import { deleteCadenceStep } from "@/actions/cadence-steps";
import { CADENCE_CHANNEL_LABELS, type CadenceChannel } from "@/lib/validations/cadence";

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

  const getChannelColor = (channel: string): string => {
    const colors: Record<string, string> = {
      email: "bg-green-100 border-green-300 text-green-700",
      linkedin: "bg-indigo-100 border-indigo-300 text-indigo-700",
      whatsapp: "bg-emerald-100 border-emerald-300 text-emerald-700",
      call: "bg-blue-100 border-blue-300 text-blue-700",
      meeting: "bg-purple-100 border-purple-300 text-purple-700",
      instagram: "bg-pink-100 border-pink-300 text-pink-700",
    };
    return colors[channel] || "bg-gray-100 border-gray-300 text-gray-700";
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
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />

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
                  return (
                    <div
                      key={step.id}
                      className={`rounded-lg border p-4 ${getChannelColor(step.channel)}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{channelInfo.icon}</span>
                            <span className="font-medium">{channelInfo.label}</span>
                          </div>
                          <p className="mt-1 font-medium text-gray-900">
                            {step.subject}
                          </p>
                          {step.description && (
                            <p className="mt-1 text-sm opacity-80">
                              {step.description}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => handleDelete(step)}
                          disabled={loading === step.id}
                          className="ml-2 rounded-md p-1 opacity-60 hover:bg-white/50 hover:opacity-100 disabled:opacity-30"
                          title="Excluir etapa"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
