"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { XCircle, SkipForward, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useMarkActivityFailed, useMarkActivitySkipped } from "@/hooks/activities/use-activities";

interface ActivityOutcomeButtonsProps {
  activityId: string;
  completed: boolean;
  failedAt?: Date | string | null;
  skippedAt?: Date | string | null;
}

export function ActivityOutcomeButtons({
  activityId,
  completed,
  failedAt,
  skippedAt,
}: ActivityOutcomeButtonsProps) {
  const router = useRouter();
  const markFailed = useMarkActivityFailed();
  const markSkipped = useMarkActivitySkipped();
  const [modal, setModal] = useState<"failed" | "skipped" | null>(null);
  const [reason, setReason] = useState("");
  const loading = markFailed.isPending || markSkipped.isPending;

  // Only show for pending activities
  if (completed || failedAt || skippedAt) return null;

  const handleSubmit = () => {
    if (!reason.trim()) {
      toast.error("Informe o motivo");
      return;
    }

    const mutate = modal === "failed"
      ? () => markFailed.mutateAsync({ id: activityId, reason })
      : () => markSkipped.mutateAsync({ id: activityId, reason });

    mutate().then(() => {
      toast.success(modal === "failed" ? "Atividade marcada como falha" : "Atividade pulada");
      setModal(null);
      setReason("");
      router.refresh();
    }).catch((err) => {
      toast.error(err instanceof Error ? err.message : "Erro");
    });
  };

  return (
    <>
      <div className="flex items-center gap-1">
        <button
          onClick={() => setModal("failed")}
          className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
          title="Marcar como falha"
        >
          <XCircle className="h-4 w-4" />
        </button>
        <button
          onClick={() => setModal("skipped")}
          className="rounded p-1.5 text-gray-400 hover:bg-amber-50 hover:text-amber-500 transition-colors"
          title="Pular atividade"
        >
          <SkipForward className="h-4 w-4" />
        </button>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">
              {modal === "failed" ? "Marcar como falha" : "Pular atividade"}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {modal === "failed"
                ? "Informe o motivo da falha (ex: não atendeu, sem resposta)"
                : "Informe o motivo para pular (ex: sem email cadastrado, sem telefone)"}
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-3 w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              rows={3}
              placeholder="Motivo..."
              autoFocus
            />
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => { setModal(null); setReason(""); }}
                disabled={loading}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || !reason.trim()}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50 ${
                  modal === "failed"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-amber-600 hover:bg-amber-700"
                }`}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : modal === "failed" ? (
                  "Marcar como falha"
                ) : (
                  "Pular"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
