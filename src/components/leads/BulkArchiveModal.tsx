"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api-client";
import { Archive, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface BulkArchiveModalProps {
  leadIds: string[];
  onClose: () => void;
  onSuccess: (result: { archived: number; skipped: number }) => void;
}

export function BulkArchiveModal({ leadIds, onClose, onSuccess }: BulkArchiveModalProps) {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const result = await apiFetch<{ archived: number; skipped: number }>("/leads/bulk-archive", token, {
        method: "PATCH",
        body: JSON.stringify({ ids: leadIds, ...(reason.trim() ? { reason: reason.trim() } : {}) }),
      });
      const msg =
        result.skipped > 0
          ? `${result.archived} arquivado(s), ${result.skipped} ignorado(s) (já arquivado ou convertido)`
          : `${result.archived} lead(s) arquivado(s) com sucesso`;
      toast.success(msg);
      onSuccess(result);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao arquivar leads");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
            <Archive className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Arquivar em lote</h2>
            <p className="text-sm text-gray-500">
              {leadIds.length} {leadIds.length === 1 ? "lead selecionado" : "leads selecionados"}
            </p>
          </div>
        </div>

        <p className="mb-4 text-sm text-gray-600">
          Leads já arquivados ou convertidos serão ignorados automaticamente.
          Opcionalmente informe o motivo:
        </p>

        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Ex: Cadência cancelada Q2 2026, fora do ICP..."
          rows={3}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          autoFocus
          disabled={loading}
        />

        <div className="mt-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
            Arquivar
          </button>
        </div>
      </div>
    </div>
  );
}
