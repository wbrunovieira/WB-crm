"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { archiveLead, unarchiveLead } from "@/actions/leads";
import { Archive, ArchiveRestore, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useConfirmDialog, ConfirmDialog } from "@/components/shared/ConfirmDialog";

interface ArchiveLeadButtonProps {
  leadId: string;
  isArchived: boolean;
}

export function ArchiveLeadButton({ leadId, isArchived }: ArchiveLeadButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { confirm, dialogProps } = useConfirmDialog();

  const handleClick = async () => {
    const action = isArchived ? "desarquivar" : "arquivar";
    const confirmed = await confirm({
      title: "Confirmar",
      message: `Tem certeza que deseja ${action} este lead?`,
      confirmLabel: isArchived ? "Desarquivar" : "Arquivar",
      variant: "warning",
    });
    if (!confirmed) return;

    setLoading(true);
    try {
      if (isArchived) {
        await unarchiveLead(leadId);
        toast.success("Lead desarquivado com sucesso");
      } else {
        await archiveLead(leadId);
        toast.success("Lead arquivado com sucesso");
      }
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Erro ao ${action} lead`);
    } finally {
      setLoading(false);
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
    </>
  );
}
