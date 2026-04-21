"use client";

import { useState, useMemo } from "react";
import {
  Building2, Plus, X, Loader2, ChevronDown, ChevronUp,
} from "lucide-react";
import {
  useLeadSectors,
  useSectors,
  useLinkLeadToSector,
  useUnlinkLeadFromSector,
} from "@/hooks/sectors/use-sectors";
import { toast } from "sonner";
import { useConfirmDialog, ConfirmDialog } from "@/components/shared/ConfirmDialog";

interface LeadSectorSectionProps {
  leadId: string;
  isConverted?: boolean;
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="space-y-0.5">
      <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</dt>
      <dd className="text-sm text-gray-800 whitespace-pre-line">{value}</dd>
    </div>
  );
}

export function LeadSectorSection({ leadId, isConverted }: LeadSectorSectionProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedSectorId, setSelectedSectorId] = useState("");
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);
  const { confirm, dialogProps } = useConfirmDialog();

  const { data: linked = [] } = useLeadSectors(leadId);
  const { data: allSectors = [] } = useSectors();
  const linkMutation = useLinkLeadToSector();
  const unlinkMutation = useUnlinkLeadFromSector();

  const linkedIds = useMemo(() => new Set(linked.map((l) => l.sector.id)), [linked]);
  const available = useMemo(() => allSectors.filter((s) => !linkedIds.has(s.id)), [allSectors, linkedIds]);

  const handleLink = async () => {
    if (!selectedSectorId) return;
    try {
      await linkMutation.mutateAsync({ leadId, sectorId: selectedSectorId });
      toast.success("Setor vinculado");
      setShowForm(false);
      setSelectedSectorId("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao vincular setor");
    }
  };

  const handleUnlink = async (sectorId: string, sectorName: string) => {
    const confirmed = await confirm({
      title: "Desvincular setor",
      message: `Remover "${sectorName}" deste lead?`,
      confirmLabel: "Remover",
      variant: "warning",
    });
    if (!confirmed) return;

    setUnlinkingId(sectorId);
    try {
      await unlinkMutation.mutateAsync({ leadId, sectorId });
      toast.success("Setor removido");
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
            disabled={!selectedSectorId || linkMutation.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {linkMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Vincular"}
          </button>
          <button
            onClick={() => { setShowForm(false); setSelectedSectorId(""); }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {linked.length === 0 ? (
        <p className="text-sm text-gray-400 italic">Nenhum setor vinculado</p>
      ) : (
        <div className="space-y-3">
          {linked.map(({ sector: s }) => {
            const isExpanded = expandedId === s.id;
            return (
              <div key={s.id} className="rounded-lg border border-gray-200 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
                  <button
                    className="flex items-center gap-2 text-left flex-1 min-w-0"
                    onClick={() => setExpandedId(isExpanded ? null : s.id)}
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
                      onClick={() => handleUnlink(s.id, s.name)}
                      disabled={unlinkingId === s.id}
                      className="ml-3 shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                      title="Remover"
                    >
                      {unlinkingId === s.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </div>

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
