"use client";

import {
  usePauseLeadCadence,
  useResumeLeadCadence,
  useCancelLeadCadence,
} from "@/hooks/cadences/use-cadences";
import { EntityCadenceSection } from "@/components/shared/cadence/EntityCadenceSection";
import { ApplyCadenceModal } from "./ApplyCadenceModal";

type LeadCadenceSectionProps = {
  leadId: string;
  isConverted?: boolean;
};

export function LeadCadenceSection({ leadId, isConverted = false }: LeadCadenceSectionProps) {
  return (
    <EntityCadenceSection
      entityId={leadId}
      entity="lead"
      isConverted={isConverted}
      labels={{
        emptyState: "Nenhuma cadência aplicada a este lead.",
        resumeMessage: "Retomar esta cadência? As datas das atividades pendentes serão ajustadas.",
      }}
      hooks={{
        usePause: usePauseLeadCadence,
        useResume: useResumeLeadCadence,
        useCancel: useCancelLeadCadence,
      }}
      mutationArg={(id) => ({ leadCadenceId: id, leadId })}
      renderModal={({ onClose, onSuccess }) => (
        <ApplyCadenceModal leadId={leadId} onClose={onClose} onSuccess={onSuccess} />
      )}
    />
  );
}
