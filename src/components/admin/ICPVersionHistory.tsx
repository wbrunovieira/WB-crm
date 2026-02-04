"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
import { restoreICPVersion } from "@/actions/icps";

interface Version {
  id: string;
  versionNumber: number;
  name: string;
  content: string;
  status: string;
  changeReason: string | null;
  createdAt: Date;
  user: {
    id: string;
    name: string | null;
  };
}

interface ICPVersionHistoryProps {
  icpId: string;
  versions: Version[];
}

export function ICPVersionHistory({ icpId, versions }: ICPVersionHistoryProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [expandedVersion, setExpandedVersion] = useState<number | null>(null);

  const handleRestore = async (versionNumber: number) => {
    if (!confirm(`Restaurar para a versão ${versionNumber}? Uma nova versão será criada com o conteúdo restaurado.`)) {
      return;
    }

    setLoading(true);
    try {
      await restoreICPVersion(icpId, versionNumber);
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao restaurar versão");
    } finally {
      setLoading(false);
    }
  };

  if (versions.length === 0) {
    return <p className="text-sm text-gray-500">Nenhuma versão disponível.</p>;
  }

  return (
    <div className="space-y-2">
      {versions.map((version, index) => {
        const isLatest = index === 0;
        const isExpanded = expandedVersion === version.versionNumber;

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
                  {" por "}
                  {version.user.name || "Desconhecido"}
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
                    onClick={() => handleRestore(version.versionNumber)}
                    disabled={loading}
                    className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-primary disabled:opacity-50"
                    title="Restaurar esta versão"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() =>
                    setExpandedVersion(isExpanded ? null : version.versionNumber)
                  }
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
  );
}
