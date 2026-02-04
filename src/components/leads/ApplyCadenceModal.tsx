"use client";

import { useState, useEffect } from "react";
import { X, Loader2, Zap, Target, Calendar, ChevronDown, ChevronUp } from "lucide-react";
import {
  getAvailableCadencesForLead,
  applyCadenceToLead,
} from "@/actions/lead-cadences";
import {
  CADENCE_CHANNEL_LABELS,
  type CadenceChannel,
} from "@/lib/validations/cadence";

type AvailableCadence = Awaited<ReturnType<typeof getAvailableCadencesForLead>>[number];

type ApplyCadenceModalProps = {
  leadId: string;
  onClose: () => void;
  onSuccess: () => void;
};

export function ApplyCadenceModal({ leadId, onClose, onSuccess }: ApplyCadenceModalProps) {
  const [cadences, setCadences] = useState<AvailableCadence[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedCadenceId, setSelectedCadenceId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [notes, setNotes] = useState("");
  const [expandedCadence, setExpandedCadence] = useState<string | null>(null);

  useEffect(() => {
    async function loadCadences() {
      try {
        const data = await getAvailableCadencesForLead(leadId);
        setCadences(data);
        if (data.length === 1) {
          setSelectedCadenceId(data[0].id);
        }
      } catch {
        setError("Erro ao carregar cadências disponíveis");
      } finally {
        setLoading(false);
      }
    }
    loadCadences();
  }, [leadId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCadenceId) {
      setError("Selecione uma cadência");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await applyCadenceToLead({
        leadId,
        cadenceId: selectedCadenceId,
        startDate: new Date(startDate),
        notes: notes || undefined,
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao aplicar cadência");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCadence = cadences.find((c) => c.id === selectedCadenceId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900">
            <Zap className="h-6 w-6 text-primary" />
            Aplicar Cadência
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : cadences.length === 0 ? (
            <div className="text-center py-12">
              <Zap className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-4 text-gray-600">
                Nenhuma cadência disponível para este lead.
              </p>
              <p className="mt-2 text-sm text-gray-500">
                Certifique-se de que existem cadências ativas (genéricas ou do ICP vinculado).
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* Cadence Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Selecione a Cadência *
                </label>
                <div className="space-y-3">
                  {cadences.map((cadence) => (
                    <div
                      key={cadence.id}
                      className={`rounded-lg border-2 transition-colors cursor-pointer ${
                        selectedCadenceId === cadence.id
                          ? "border-primary bg-primary/5"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div
                        className="p-4"
                        onClick={() => setSelectedCadenceId(cadence.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <input
                                type="radio"
                                name="cadence"
                                checked={selectedCadenceId === cadence.id}
                                onChange={() => setSelectedCadenceId(cadence.id)}
                                className="h-4 w-4 text-primary focus:ring-primary"
                              />
                              <h4 className="font-semibold text-gray-900">
                                {cadence.name}
                              </h4>
                            </div>
                            <div className="mt-2 ml-7 flex flex-wrap items-center gap-3 text-sm text-gray-500">
                              <span className="flex items-center gap-1">
                                <Zap className="h-4 w-4" />
                                {cadence._count.steps} etapas
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {cadence.durationDays} dias
                              </span>
                              {cadence.icp ? (
                                <span className="flex items-center gap-1 text-primary">
                                  <Target className="h-4 w-4" />
                                  {cadence.icp.name}
                                </span>
                              ) : (
                                <span className="text-gray-400">
                                  Cadência Genérica
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Toggle Steps Preview */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedCadence(
                              expandedCadence === cadence.id ? null : cadence.id
                            );
                          }}
                          className="mt-3 ml-7 flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          {expandedCadence === cadence.id ? (
                            <>
                              <ChevronUp className="h-4 w-4" />
                              Ocultar etapas
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-4 w-4" />
                              Ver etapas
                            </>
                          )}
                        </button>
                      </div>

                      {/* Expanded Steps Preview */}
                      {expandedCadence === cadence.id && (
                        <div className="border-t bg-gray-50 p-4">
                          <div className="space-y-2">
                            {cadence.steps.map((step) => {
                              const channelInfo = CADENCE_CHANNEL_LABELS[step.channel as CadenceChannel];
                              return (
                                <div
                                  key={step.id}
                                  className="flex items-center gap-3 text-sm"
                                >
                                  <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-white border font-semibold text-xs">
                                    D{step.dayNumber}
                                  </span>
                                  <span className="text-lg">{channelInfo?.icon || "📌"}</span>
                                  <span className="text-gray-700">
                                    {channelInfo?.label || step.channel}
                                  </span>
                                  <span className="text-gray-500 truncate">
                                    - {step.subject}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Start Date */}
              <div>
                <label
                  htmlFor="startDate"
                  className="block text-sm font-medium text-gray-700"
                >
                  Data de Início *
                </label>
                <input
                  type="date"
                  id="startDate"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <p className="mt-1 text-xs text-gray-500">
                  As atividades serão agendadas a partir desta data
                </p>
              </div>

              {/* Notes */}
              <div>
                <label
                  htmlFor="notes"
                  className="block text-sm font-medium text-gray-700"
                >
                  Observações
                </label>
                <textarea
                  id="notes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Anotações sobre esta aplicação..."
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Summary */}
              {selectedCadence && (
                <div className="rounded-lg bg-purple-50 p-4">
                  <h4 className="font-semibold text-purple-900 mb-2">Resumo</h4>
                  <ul className="text-sm text-purple-800 space-y-1">
                    <li>
                      Cadência: <strong>{selectedCadence.name}</strong>
                    </li>
                    <li>
                      {selectedCadence._count.steps} atividades serão criadas
                    </li>
                    <li>
                      Duração: {selectedCadence.durationDays} dias a partir de{" "}
                      {new Date(startDate).toLocaleDateString("pt-BR")}
                    </li>
                  </ul>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting || !selectedCadenceId}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Aplicando...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4" />
                      Aplicar Cadência
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
