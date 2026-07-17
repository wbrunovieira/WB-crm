"use client";

import { useApplyCadence } from "@/hooks/cadences/use-cadences";
import { EntityApplyCadenceModal } from "@/components/shared/cadence/EntityApplyCadenceModal";

type ApplyCadenceModalProps = {
  leadId: string;
  onClose: () => void;
  onSuccess: () => void;
};

export function ApplyCadenceModal({ leadId, onClose, onSuccess }: ApplyCadenceModalProps) {
  return (
    <EntityApplyCadenceModal
      entity="lead"
      entityId={leadId}
      idParam={{ leadId }}
      labels={{
        emptyStateTitle: "Nenhuma cadência disponível para este lead.",
        emptyStateHint: "Certifique-se de que existem cadências ativas (genéricas ou do ICP vinculado).",
      }}
      useApply={useApplyCadence}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}
