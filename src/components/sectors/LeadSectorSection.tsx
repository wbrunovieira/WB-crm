"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Building2, Plus, X, Loader2, ChevronDown, ChevronUp,
} from "lucide-react";
import {
  getLeadSectors,
  linkLeadToSector,
  unlinkLeadFromSector,
} from "@/actions/sectors";
import { getSectorsForSelect } from "@/actions/sectors";
import { toast } from "sonner";
import { useConfirmDialog, ConfirmDialog } from "@/components/shared/ConfirmDialog";

type SectorSelect = { id: string; name: string; slug: string };

type LinkedSector = {
  id: string;
  sectorId: string;
  sector: {
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
  };
};

interface LeadSectorSectionProps {
  leadId: string;
  isConverted?: boolean;
}

function InfoRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="space-y-0.5">
      <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</dt>
      <dd className="text-sm text-gray-800 whitespace-pre-line">{value}</dd>
    </div>
  );
}

export function LeadSectorSection({ leadId, isConverted }: LeadSectorSectionProps) {
  const router = useRouter();
  const [linked, setLinked] = useState<LinkedSector[]>([]);
  const [available, setAvailable] = useState<SectorSelect[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedSectorId, setSelectedSectorId] = useState("");
  const [linking, setLinking] = useState(false);
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);
  const { confirm, dialogProps } = useConfirmDialog();

  const loadData = useCallback(async () => {
    const [linkedData, allSectors] = await Promise.all([
      getLeadSectors(leadId),
      getSectorsForSelect(),
    ]);
    setLinked(linkedData as LinkedSector[]);
    const linkedIds = new Set(linkedData.map((l) => l.sectorId));
    setAvailable(allSectors.filter((s) => !linkedIds.has(s.id)));
  }, [leadId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleLink = async () => {
    if (!selectedSectorId) return;
    setLinking(true);
    try {
      await linkLeadToSector(leadId, selectedSectorId);
      toast.success("Setor vinculado");
      setShowForm(false);
      setSelectedSectorId("");
      await loadData();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao vincular setor");
    } finally {
      setLinking(false);
    }
  };

  const handleUnlink = async (linkId: string, sectorName: string) => {
    const confirmed = await confirm({
      title: "Desvincular setor",
      message: `Remover "${sectorName}" deste lead?`,
      confirmLabel: "Remover",
      variant: "warning",
    });
    if (!confirmed) return;

    setUnlinkingId(linkId);
    try {
      const link = linked.find((l) => l.id === linkId);
      if (link) {
        await unlinkLeadFromSector(leadId, link.sectorId);
        toast.success("Setor removido");
        await loadData();
        router.refresh();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao remover setor");
    } finally {
      setUnlinkingId(null);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          <h3 className="text-base font-semibold text-gray-900">Setores</h3>
          {linked.length > 0 && (
            <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-700">
              {linked.length}
            </span>
          )}
        </div>
        {!isConverted && available.length > 0 && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Vincular setor
          </button>
        )}
      </div>

      {/* Link form */}
      {showForm && (
        <div className="mb-4 flex gap-2">
          <select
            value={selectedSectorId}
            onChange={(e) => setSelectedSectorId(e.target.value)}
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">Selecionar setor...</option>
            {available.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <button
            onClick={handleLink}
            disabled={!selectedSectorId || linking}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {linking ? <Loader2 className="h-4 w-4 animate-spin" /> : "Vincular"}
          </button>
          <button
            onClick={() => { setShowForm(false); setSelectedSectorId(""); }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Linked sectors */}
      {linked.length === 0 ? (
        <p className="text-sm text-gray-400 italic">Nenhum setor vinculado</p>
      ) : (
        <div className="space-y-3">
          {linked.map((link) => {
            const s = link.sector;
            const isExpanded = expandedId === link.id;
            return (
              <div
                key={link.id}
                className="rounded-lg border border-gray-200 overflow-hidden"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
                  <button
                    className="flex items-center gap-2 text-left flex-1 min-w-0"
                    onClick={() => setExpandedId(isExpanded ? null : link.id)}
                  >
                    <span className="font-semibold text-gray-900 text-sm">{s.name}</span>
                    {s.marketSize && (
                      <span className="text-xs text-gray-500 truncate hidden sm:block">
                        · {s.marketSize}
                      </span>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-gray-400 shrink-0 ml-auto" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-400 shrink-0 ml-auto" />
                    )}
                  </button>
                  {!isConverted && (
                    <button
                      onClick={() => handleUnlink(link.id, s.name)}
                      disabled={unlinkingId === link.id}
                      className="ml-3 shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                      title="Remover"
                    >
                      {unlinkingId === link.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="px-4 py-4 bg-white">
                    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <InfoRow label="Descrição" value={s.description} />
                      <InfoRow label="Tamanho do mercado" value={s.marketSize} />
                      <InfoRow label="Contexto do mercado" value={s.marketSizeNotes} />
                      <InfoRow label="Ticket médio" value={s.averageTicket} />
                      <InfoRow label="Época de compra" value={s.budgetSeason} />
                      {s.salesCycleDays && (
                        <div className="space-y-0.5">
                          <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ciclo de venda</dt>
                          <dd className="text-sm text-gray-800">
                            {s.salesCycleDays} dias
                            {s.salesCycleNotes && ` · ${s.salesCycleNotes}`}
                          </dd>
                        </div>
                      )}
                      <InfoRow label="Tomadores de decisão" value={s.decisionMakers} />
                      <InfoRow label="Processo de compra" value={s.buyingProcess} />
                      <InfoRow label="Objeções comuns" value={s.mainObjections} />
                      <InfoRow label="Principais dores" value={s.mainPains} />
                      <InfoRow label="Empresas referência" value={s.referenceCompanies} />
                      <InfoRow label="Concorrentes" value={s.competitorsLandscape} />
                      <InfoRow label="Jargões e termos" value={s.jargons} />
                      <InfoRow label="Compliance / Regulatório" value={s.regulatoryNotes} />
                    </dl>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog {...dialogProps} />
    </div>
  );
}
