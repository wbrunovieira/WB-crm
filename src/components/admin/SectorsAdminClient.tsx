"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useSectors } from "@/hooks/sectors/use-sectors";
import { SectorForm } from "./SectorForm";
import { SectorsList } from "./SectorsList";
import type { Sector as SectorHook } from "@/hooks/sectors/use-sectors";

type Sector = SectorHook & {
  _count?: { leads: number; organizations: number };
};

export function SectorsAdminClient() {
  const [editingSector, setEditingSector] = useState<Sector | null>(null);
  const { data: sectors = [], isLoading } = useSectors();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const sectorsWithCount = sectors.map((s) => ({
    ...s,
    description: s.description ?? null,
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
