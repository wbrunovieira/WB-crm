"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";
import { updateCadenceStep } from "@/actions/cadence-steps";
import { CADENCE_CHANNEL_LABELS, type CadenceChannel } from "@/lib/validations/cadence";

type CadenceStep = {
  id: string;
  dayNumber: number;
  channel: string;
  subject: string;
  description: string | null;
  order: number;
};

type CadenceStepEditModalProps = {
  step: CadenceStep;
  isOpen: boolean;
  onClose: () => void;
};

export function CadenceStepEditModal({ step, isOpen, onClose }: CadenceStepEditModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dayNumber, setDayNumber] = useState(step.dayNumber);
  const [channel, setChannel] = useState<CadenceChannel>(step.channel as CadenceChannel);
  const [subject, setSubject] = useState(step.subject);
  const [description, setDescription] = useState(step.description || "");

  // Reset form when step changes
  useEffect(() => {
    setDayNumber(step.dayNumber);
    setChannel(step.channel as CadenceChannel);
    setSubject(step.subject);
    setDescription(step.description || "");
    setError(null);
  }, [step]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await updateCadenceStep(step.id, {
        dayNumber,
        channel,
        subject,
        description: description || null,
      });

      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar etapa");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Editar Etapa - Dia {step.dayNumber}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="edit-dayNumber"
                className="block text-sm font-medium text-gray-700"
              >
                Dia *
              </label>
              <input
                type="number"
                id="edit-dayNumber"
                required
                min={1}
                max={90}
                value={dayNumber}
                onChange={(e) => setDayNumber(parseInt(e.target.value) || 1)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label
                htmlFor="edit-channel"
                className="block text-sm font-medium text-gray-700"
              >
                Canal *
              </label>
              <select
                id="edit-channel"
                required
                value={channel}
                onChange={(e) => setChannel(e.target.value as CadenceChannel)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {Object.entries(CADENCE_CHANNEL_LABELS).map(([value, { label, icon }]) => (
                  <option key={value} value={value}>
                    {icon} {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="edit-subject"
              className="block text-sm font-medium text-gray-700"
            >
              Assunto *
            </label>
            <input
              type="text"
              id="edit-subject"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Dor direta, pergunta aberta"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label
              htmlFor="edit-description"
              className="block text-sm font-medium text-gray-700"
            >
              Descrição / Script
            </label>
            <textarea
              id="edit-description"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalhes sobre o que fazer nesta etapa..."
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-md bg-primary px-4 py-2 text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando...
                </span>
              ) : (
                "Salvar Alterações"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
