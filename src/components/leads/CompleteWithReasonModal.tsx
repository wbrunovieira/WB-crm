"use client";

import { useState, useEffect } from "react";
import { X, CheckCircle2, Plus, Loader2 } from "lucide-react";
import {
  getDisqualificationReasons,
  createDisqualificationReason,
} from "@/actions/disqualification-reasons";
import { toast } from "sonner";

interface CompleteWithReasonModalProps {
  onConfirm: (reason: string | undefined) => void;
  onClose: () => void;
  loading?: boolean;
}

export function CompleteWithReasonModal({
  onConfirm,
  onClose,
  loading = false,
}: CompleteWithReasonModalProps) {
  const [reasons, setReasons] = useState<string[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [newReason, setNewReason] = useState("");
  const [savingNew, setSavingNew] = useState(false);
  const [loadingReasons, setLoadingReasons] = useState(true);

  useEffect(() => {
    getDisqualificationReasons()
      .then(setReasons)
      .finally(() => setLoadingReasons(false));
  }, []);

  async function handleAddReason() {
    const trimmed = newReason.trim();
    if (!trimmed) return;
    setSavingNew(true);
    const result = await createDisqualificationReason(trimmed);
    if (result.success) {
      const updated = await getDisqualificationReasons();
      setReasons(updated);
      setSelected(trimmed);
      setNewReason("");
      toast.success("Motivo cadastrado");
    } else {
      toast.error(result.error ?? "Erro ao cadastrar motivo");
    }
    setSavingNew(false);
  }

  function handleConfirm() {
    onConfirm(selected || undefined);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900">
              Concluir Cadência
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-4 text-sm text-gray-500">
          Selecione o motivo pelo qual o lead não foi convertido (opcional).
        </p>

        {/* Reason list */}
        {loadingReasons ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="mb-4 space-y-2 max-h-60 overflow-y-auto pr-1">
            {/* No reason option */}
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 px-3 py-2.5 transition-colors hover:bg-gray-50 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50">
              <input
                type="radio"
                name="reason"
                value=""
                checked={selected === ""}
                onChange={() => setSelected("")}
                className="accent-blue-600"
              />
              <span className="text-sm text-gray-500 italic">
                Sem motivo especificado
              </span>
            </label>
            {reasons.map((reason) => (
              <label
                key={reason}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 px-3 py-2.5 transition-colors hover:bg-gray-50 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50"
              >
                <input
                  type="radio"
                  name="reason"
                  value={reason}
                  checked={selected === reason}
                  onChange={() => setSelected(reason)}
                  className="accent-blue-600"
                />
                <span className="text-sm text-gray-700">{reason}</span>
              </label>
            ))}
          </div>
        )}

        {/* Add custom reason */}
        <div className="mb-5">
          <label className="mb-1.5 block text-xs font-medium text-gray-500 uppercase tracking-wide">
            Cadastrar outro motivo
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newReason}
              onChange={(e) => setNewReason(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddReason();
                }
              }}
              placeholder="Ex: Timing inadequado..."
              disabled={savingNew || loading}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
            />
            <button
              type="button"
              onClick={handleAddReason}
              disabled={!newReason.trim() || savingNew || loading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-40"
            >
              {savingNew ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              Cadastrar
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Concluindo...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Concluir
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
