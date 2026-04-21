"use client";

import { useState } from "react";
import { RotateCcw, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { useICPVersions, useRestoreICPVersion } from "@/hooks/icps/use-icps";
import { toast } from "sonner";
import { useConfirmDialog, ConfirmDialog } from "@/components/shared/ConfirmDialog";

interface ICPVersionHistoryProps {
  icpId: string;
}

export function ICPVersionHistory({ icpId }: ICPVersionHistoryProps) {
  const [expandedVersion, setExpandedVersion] = useState<string | null>(null);
  const { confirm, dialogProps } = useConfirmDialog();
  const { data: versions = [], isLoading } = useICPVersions(icpId);
  const restoreMutation = useRestoreICPVersion();

  const handleRestore = async (versionId: string, versionNumber: number) => {
    const confirmed = await confirm({
      title: "Confirmar",
      message: `Restaurar para a versão ${versionNumber}? Uma nova versão será criada com o conteúdo restaurado.`,
      confirmLabel: "Restaurar",
      variant: "warning",
    });
    if (!confirmed) return;

    try {
      await restoreMutation.mutateAsync({ icpId, versionId });
      toast.success("Versão restaurada");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao restaurar versão");
    }
  };

  if (isLoading) {
    return <Loader2 className="h-4 w-4 animate-spin text-gray-400" />;
  }

  if (versions.length === 0) {
    return <p className="text-sm text-gray-500">Nenhuma versão disponível.</p>;
  }

  return (
    <>
    <div className="space-y-2">
      {versions.map((version, index) => {
        const isLatest = index === 0;
        const isExpanded = expandedVersion === version.id;

        return (
          <div
            key={version.id}
            className={`rounded-md border ${isLatest ? "border-primary/30 bg-primary/5" : "border-gray-200"}`}
          >
            <div className="flex items-center justify-between p-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">
                    v{version.versionNumber}
                  </span>
                  {isLatest && (
                    <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-white">
                      Atual
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  {new Date(version.createdAt).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {version.user && ` por ${version.user.name || "Desconhecido"}`}
                </p>
                {version.changeReason && (
                  <p className="mt-1 text-xs text-gray-600 italic">
                    &quot;{version.changeReason}&quot;
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1">
                {!isLatest && (
                  <button
                    onClick={() => handleRestore(version.id, version.versionNumber)}
                    disabled={restoreMutation.isPending}
                    className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-primary disabled:opacity-50"
                    title="Restaurar esta versão"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => setExpandedVersion(isExpanded ? null : version.id)}
                  className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-primary"
                  title={isExpanded ? "Recolher" : "Expandir"}
                >
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {isExpanded && (
              <div className="border-t border-gray-200 p-3">
                <div className="mb-2">
                  <span className="text-xs font-medium text-gray-500">Nome:</span>
                  <p className="text-sm text-gray-900">{version.name}</p>
                </div>
                <div className="mb-2">
                  <span className="text-xs font-medium text-gray-500">Status:</span>
                  <p className="text-sm text-gray-900">{version.status}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-gray-500">Conteúdo:</span>
                  <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-gray-50 p-2 text-xs text-gray-700">
                    {version.content}
                  </pre>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
    <ConfirmDialog {...dialogProps} />
    </>
  );
}
