"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useSectors } from "@/hooks/sectors/use-sectors";
import { SectorForm } from "./SectorForm";
import { SectorsList } from "./SectorsList";

type SectorWithCount = {
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

export function SectorsAdminClient() {
  const [editingSector, setEditingSector] = useState<SectorWithCount | null>(null);
  const { data: sectors = [], isLoading } = useSectors();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const sectorsWithCount: SectorWithCount[] = sectors.map((s) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
    description: s.description ?? null,
    isActive: s.isActive,
    marketSize: s.marketSize ?? null,
    marketSizeNotes: s.marketSizeNotes ?? null,
    averageTicket: s.averageTicket ?? null,
    budgetSeason: s.budgetSeason ?? null,
    salesCycleDays: s.salesCycleDays ?? null,
    salesCycleNotes: s.salesCycleNotes ?? null,
    decisionMakers: s.decisionMakers ?? null,
    buyingProcess: s.buyingProcess ?? null,
    mainObjections: s.mainObjections ?? null,
    mainPains: s.mainPains ?? null,
    referenceCompanies: s.referenceCompanies ?? null,
    competitorsLandscape: s.competitorsLandscape ?? null,
    jargons: s.jargons ?? null,
    regulatoryNotes: s.regulatoryNotes ?? null,
    _count: { leads: 0, organizations: 0 },
  }));

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="lg:col-span-1">
        <SectorForm
          editingSector={editingSector}
          onCancelEdit={() => setEditingSector(null)}
        />
      </div>
      <div className="lg:col-span-2">
        <SectorsList
          sectors={sectorsWithCount}
          onEdit={(s) => setEditingSector(s)}
        />
      </div>
    </div>
  );
}
