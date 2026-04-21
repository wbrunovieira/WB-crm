"use client";

import { X, Loader2, Zap, Calendar } from "lucide-react";
import {
  useCadences,
  useBulkApplyCadence,
} from "@/hooks/cadences/use-cadences";
import { toast } from "sonner";
import { useState } from "react";

type BulkApplyCadenceModalProps = {
  leadIds: string[];
  onClose: () => void;
  onSuccess: () => void;
};

export function BulkApplyCadenceModal({ leadIds, onClose, onSuccess }: BulkApplyCadenceModalProps) {
  const { data: cadences = [], isLoading } = useCadences();
  const activeCadences = cadences.filter((c) => c.status === "active");
  const bulkApplyMutation = useBulkApplyCadence();

  const [selectedCadenceId, setSelectedCadenceId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCadenceId) {
      setError("Selecione uma cadência");
      return;
    }

    setError(null);

    try {
      const result = await bulkApplyMutation.mutateAsync({
        cadenceId: selectedCadenceId,
        leadIds,
        startDate: new Date(startDate),
        notes: notes || undefined,
      });

      if (result.applied > 0) {
        toast.success(
          `Cadência aplicada a ${result.applied} lead${result.applied > 1 ? "s" : ""}${
            result.skipped > 0
              ? `. ${result.skipped} pulado${result.skipped > 1 ? "s" : ""} (já possuíam esta cadência)`
              : ""
          }`
        );
      } else {
        toast.info("Nenhum lead elegível. Todos já possuem esta cadência aplicada.");
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao aplicar cadência em lote");
    }
  };

  const selectedCadence = activeCadences.find((c) => c.id === selectedCadenceId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900">
            <Zap className="h-6 w-6 text-primary" />
            Aplicar Cadência em Lote
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
          {/* Lead count info */}
          <div className="mb-6 rounded-lg bg-blue-50 border border-blue-200 p-3">
            <p className="text-sm text-blue-800">
              <strong>{leadIds.length}</strong> lead{leadIds.length > 1 ? "s" : ""} selecionado{leadIds.length > 1 ? "s" : ""}.
              A cadência será aplicada a todos que ainda não a possuem.
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : activeCadences.length === 0 ? (
            <div className="text-center py-12">
              <Zap className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-4 text-gray-600">Nenhuma cadência ativa disponível.</p>
              <p className="mt-2 text-sm text-gray-500">
                Crie cadências em Administração &gt; Cadências.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</div>
              )}

              {/* Cadence Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Selecione a Cadência *
                </label>
                <div className="max-h-64 space-y-3 overflow-y-auto pr-1">
                  {activeCadences.map((cadence) => (
                    <div
                      key={cadence.id}
                      className={`rounded-lg border-2 transition-colors cursor-pointer ${
                        selectedCadenceId === cadence.id
                          ? "border-primary bg-primary/5"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => setSelectedCadenceId(cadence.id)}
                    >
                      <div className="p-4">
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="cadence"
                            checked={selectedCadenceId === cadence.id}
                            onChange={() => setSelectedCadenceId(cadence.id)}
                            className="h-4 w-4 text-primary focus:ring-primary"
                          />
                          <h4 className="font-semibold text-gray-900">{cadence.name}</h4>
                        </div>
                        <div className="mt-2 ml-7 flex flex-wrap items-center gap-3 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {cadence.durationDays} dias
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Start Date */}
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
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
                  As atividades serão agendadas a partir desta data para todos os leads
                </p>
              </div>

              {/* Notes */}
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                  Observações
                </label>
                <textarea
                  id="notes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Anotações sobre esta aplicação em lote..."
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
                  disabled={bulkApplyMutation.isPending || !selectedCadenceId}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
                >
                  {bulkApplyMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Aplicando...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4" />
                      Aplicar em {leadIds.length} lead{leadIds.length > 1 ? "s" : ""}
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
