"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useArchiveLead, useUnarchiveLead } from "@/hooks/leads/use-leads";
import { Archive, ArchiveRestore, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useConfirmDialog, ConfirmDialog } from "@/components/shared/ConfirmDialog";

interface ArchiveLeadButtonProps {
  leadId: string;
  isArchived: boolean;
}

export function ArchiveLeadButton({ leadId, isArchived }: ArchiveLeadButtonProps) {
  const router = useRouter();
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [reason, setReason] = useState("");
  const { confirm, dialogProps } = useConfirmDialog();
  const archiveMutation = useArchiveLead();
  const unarchiveMutation = useUnarchiveLead();
  const loading = archiveMutation.isPending || unarchiveMutation.isPending;

  const handleClick = async () => {
    if (isArchived) {
      const confirmed = await confirm({
        title: "Desarquivar lead",
        message: "Tem certeza que deseja desarquivar este lead?",
        confirmLabel: "Desarquivar",
        variant: "warning",
      });
      if (!confirmed) return;

      try {
        await unarchiveMutation.mutateAsync(leadId);
        toast.success("Lead desarquivado com sucesso");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erro ao desarquivar lead");
      }
    } else {
      setReason("");
      setShowReasonModal(true);
    }
  };

  const handleConfirmArchive = async () => {
    setShowReasonModal(false);
    try {
      await archiveMutation.mutateAsync({ id: leadId, reason: reason.trim() || undefined });
      toast.success("Lead arquivado com sucesso");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao arquivar lead");
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        disabled={loading}
        className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold shadow-md hover:shadow-lg transition-all duration-200 ${
          isArchived
            ? "bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800"
            : "bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700"
        }`}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isArchived ? (
          <ArchiveRestore className="h-4 w-4" />
        ) : (
          <Archive className="h-4 w-4" />
        )}
        {isArchived ? "Desarquivar" : "Arquivar"}
      </button>

      <ConfirmDialog {...dialogProps} />

      {/* Archive reason modal */}
      {showReasonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-1 text-lg font-semibold text-gray-900">Arquivar lead</h2>
            <p className="mb-4 text-sm text-gray-500">
              Opcionalmente informe o motivo pelo qual este lead está sendo arquivado.
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Sem budget, cadência cancelada, fora do ICP..."
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              autoFocus
            />
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setShowReasonModal(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmArchive}
                className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
              >
                Arquivar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
