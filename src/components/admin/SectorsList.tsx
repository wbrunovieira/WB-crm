"use client";

import { useState } from "react";
import { Pencil, Trash2, Eye, EyeOff, Loader2, Building2 } from "lucide-react";
import { useUpdateSector, useDeleteSector } from "@/hooks/sectors/use-sectors";
import { toast } from "sonner";
import { useConfirmDialog, ConfirmDialog } from "@/components/shared/ConfirmDialog";

type Sector = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  marketSize: string | null;
  marketSizeNotes: string | null;
  averageTicket: string | null;
  budgetSeason: string | null;
  salesCycleDays: number | null;
  salesCycleNotes: string | null;
  decisionMakers: string | null;
  buyingProcess: string | null;
  mainObjections: string | null;
  mainPains: string | null;
  referenceCompanies: string | null;
  competitorsLandscape: string | null;
  jargons: string | null;
  regulatoryNotes: string | null;
  _count: { leads: number; organizations: number };
};

interface SectorsListProps {
  sectors: Sector[];
  onEdit: (sector: Sector) => void;
}

export function SectorsList({ sectors, onEdit }: SectorsListProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const { confirm, dialogProps } = useConfirmDialog();
  const updateMutation = useUpdateSector();
  const deleteMutation = useDeleteSector();

  const handleToggleActive = async (sector: Sector) => {
    setLoadingId(sector.id);
    try {
      await updateMutation.mutateAsync({ id: sector.id, isActive: !sector.isActive });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar setor");
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (sector: Sector) => {
    const confirmed = await confirm({
      title: "Excluir setor",
      message: `Tem certeza que deseja excluir "${sector.name}"? Esta ação não pode ser desfeita.`,
      confirmLabel: "Excluir",
      variant: "danger",
    });
    if (!confirmed) return;

    setLoadingId(sector.id);
    try {
      await deleteMutation.mutateAsync(sector.id);
      toast.success("Setor excluído");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir setor");
    } finally {
      setLoadingId(null);
    }
  };

  if (sectors.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-gray-200 p-12 text-center">
        <Building2 className="mx-auto h-10 w-10 text-gray-300 mb-3" />
        <p className="text-gray-500 font-medium">Nenhum setor cadastrado</p>
        <p className="text-sm text-gray-400 mt-1">Crie o primeiro setor no formulário ao lado</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {sectors.map((sector) => {
          const isLoading = loadingId === sector.id;
          return (
            <div
              key={sector.id}
              className={`rounded-xl border bg-white p-4 shadow-sm transition-opacity ${
                !sector.isActive ? "opacity-60" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900">{sector.name}</span>
                    <span className="text-xs text-gray-400 font-mono">{sector.slug}</span>
                    {!sector.isActive && (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                        Inativo
                      </span>
                    )}
                  </div>
                  {sector.description && (
                    <p className="mt-1 text-sm text-gray-600 line-clamp-1">{sector.description}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
                    {sector.marketSize && (
                      <span>📊 {sector.marketSize}</span>
                    )}
                    {sector.salesCycleDays && (
                      <span>⏱ {sector.salesCycleDays} dias</span>
                    )}
                    {sector.decisionMakers && (
                      <span className="truncate max-w-[200px]">👤 {sector.decisionMakers}</span>
                    )}
                    <span className="text-purple-600 font-medium">
                      {sector._count.leads} leads · {sector._count.organizations} orgs
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                  ) : (
                    <>
                      <button
                        onClick={() => onEdit(sector)}
                        className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-primary"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleToggleActive(sector)}
                        className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
                        title={sector.isActive ? "Desativar" : "Ativar"}
                      >
                        {sector.isActive ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleDelete(sector)}
                        className="rounded-lg p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600"
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <ConfirmDialog {...dialogProps} />
    </>
  );
}
