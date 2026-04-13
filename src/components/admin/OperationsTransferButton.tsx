"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightLeft, Undo2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { transferToOperations, revertFromOperations } from "@/actions/operations-transfer";
import type { EntityTransferType } from "@/actions/operations-transfer";

interface Props {
  entityType: EntityTransferType;
  entityId: string;
  entityName: string;
  inOperationsAt: Date | null;
}

export default function OperationsTransferButton({
  entityType,
  entityId,
  entityName,
  inOperationsAt,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const isInOps = !!inOperationsAt;

  function confirm() {
    const action = isInOps ? "Revert to Sales" : "Transfer to Operations";
    const description = isInOps
      ? `"${entityName}" will be moved back to CRM — automated activities will resume.`
      : `"${entityName}" will be moved to Operations — automated activities will pause.`;

    toast.custom(
      (toastId) => (
        <div className="flex flex-col gap-3 rounded-xl bg-white p-4 shadow-xl border border-gray-200 w-80">
          <p className="text-sm font-semibold text-gray-900">{action}</p>
          <p className="text-xs text-gray-500">{description}</p>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => toast.dismiss(toastId)}
              className="rounded-md px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                toast.dismiss(toastId);
                execute();
              }}
              className={`rounded-md px-3 py-1.5 text-xs font-medium text-white ${
                isInOps
                  ? "bg-blue-600 hover:bg-blue-700"
                  : "bg-orange-600 hover:bg-orange-700"
              }`}
            >
              Confirm
            </button>
          </div>
        </div>
      ),
      { duration: 10000 }
    );
  }

  async function execute() {
    setLoading(true);
    try {
      if (isInOps) {
        await revertFromOperations(entityType, entityId);
        toast.success(`"${entityName}" revertido para o CRM.`);
      } else {
        await transferToOperations(entityType, entityId);
        toast.success(`"${entityName}" transferido para Operações.`);
      }
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar entidade");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={confirm}
      disabled={loading}
      className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-60 ${
        isInOps
          ? "bg-blue-600 hover:bg-blue-700"
          : "bg-orange-600 hover:bg-orange-700"
      }`}
    >
      {loading ? (
        <Loader2 size={14} className="animate-spin" />
      ) : isInOps ? (
        <Undo2 size={14} />
      ) : (
        <ArrowRightLeft size={14} />
      )}
      {isInOps ? "Revert to Sales" : "Transfer to Operations"}
    </button>
  );
}
