"use client";

import { useState } from "react";
import { SectorForm } from "./SectorForm";
import { SectorsList } from "./SectorsList";

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

export function SectorsAdminClient({ sectors }: { sectors: Sector[] }) {
  const [editingSector, setEditingSector] = useState<Sector | null>(null);

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
          sectors={sectors}
          onEdit={(s) => setEditingSector(s)}
        />
      </div>
    </div>
  );
}
