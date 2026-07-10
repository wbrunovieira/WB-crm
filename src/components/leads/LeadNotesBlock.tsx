"use client";

import { EntityNotesBlock } from "@/components/shared/EntityNotesBlock";

type Props = {
  leadId: string;
  initialNotes: string | null | undefined;
};

/** Thin wrapper over the shared EntityNotesBlock — keeps the lead's "Notas" label. */
export function LeadNotesBlock({ leadId, initialNotes }: Props) {
  // Keep the standalone bottom spacing the lead page relied on (the partner
  // usage sits inside a grid with gap-6 and doesn't need it).
  return (
    <div className="mb-5">
      <EntityNotesBlock
        patchUrl={`/leads/${leadId}`}
        initialNotes={initialNotes}
        entityLabel="lead"
        title="Notas"
      />
    </div>
  );
}
