"use client";

import {
  usePausePartnerCadence,
  useResumePartnerCadence,
  useCancelPartnerCadence,
} from "@/hooks/cadences/use-cadences";
import { EntityCadenceSection } from "@/components/shared/cadence/EntityCadenceSection";
import { PartnerApplyCadenceModal } from "@/components/partners/PartnerApplyCadenceModal";

type PartnerCadenceSectionProps = {
  partnerId: string;
};

export function PartnerCadenceSection({ partnerId }: PartnerCadenceSectionProps) {
  return (
    <EntityCadenceSection
      entityId={partnerId}
      entity="partner"
      labels={{
        emptyState: "Nenhuma cadência aplicada a este parceiro.",
        resumeMessage: "Retomar esta cadência?",
      }}
      hooks={{
        usePause: usePausePartnerCadence,
        useResume: useResumePartnerCadence,
        useCancel: useCancelPartnerCadence,
      }}
      mutationArg={(id) => ({ partnerCadenceId: id, partnerId })}
      renderModal={({ onClose, onSuccess }) => (
        <PartnerApplyCadenceModal partnerId={partnerId} onClose={onClose} onSuccess={onSuccess} />
      )}
    />
  );
}
