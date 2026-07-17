"use client";

import { useApplyCadenceToPartner } from "@/hooks/cadences/use-cadences";
import { EntityApplyCadenceModal } from "@/components/shared/cadence/EntityApplyCadenceModal";

type PartnerApplyCadenceModalProps = {
  partnerId: string;
  onClose: () => void;
  onSuccess: () => void;
};

export function PartnerApplyCadenceModal({ partnerId, onClose, onSuccess }: PartnerApplyCadenceModalProps) {
  return (
    <EntityApplyCadenceModal
      entity="partner"
      entityId={partnerId}
      idParam={{ partnerId }}
      labels={{
        emptyStateTitle: "Nenhuma cadência disponível para este parceiro.",
        emptyStateHint: "Certifique-se de que existem cadências ativas (todas as suas cadências ativas ficam disponíveis).",
      }}
      useApply={useApplyCadenceToPartner}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}
