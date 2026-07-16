"use client";

import {
  useLeadICPs,
  useLinkLeadToICP,
  useUpdateLeadICP,
  useUnlinkLeadFromICP,
} from "@/hooks/icps/use-icps";
import { EntityICPSection, type EntityICPLabels } from "./EntityICPSection";

const LEAD_ICP_LABELS: EntityICPLabels = {
  emptyState: "Nenhum ICP vinculado a este lead.",
  notesTip: "Notas adicionais sobre o lead",
  fitStatusTip: "Quão bem o lead se encaixa no perfil ideal",
  businessMomentTip: "Em qual fase do negócio o lead está",
  platformsTip: "Quais plataformas o lead usa atualmente",
  strategicDesireTip: "O que o lead deseja alcançar estrategicamente",
  painTip: "Principal dor/problema declarado pelo lead",
  fragmentationTip: "Quão fragmentada está a operação do lead (0=unificada, 10=muito fragmentada)",
  purchaseTriggerTip: "O que motivou o lead a buscar uma solução agora",
  decisionTimeTip: "Estimativa de quando o lead vai tomar a decisão",
  complexityTip: "Complexidade técnica percebida da implementação (1=simples, 5=muito complexa)",
};

interface LeadICPSectionProps {
  leadId: string;
  isConverted?: boolean;
}

export function LeadICPSection({ leadId, isConverted = false }: LeadICPSectionProps) {
  return (
    <EntityICPSection
      entityId={leadId}
      isConverted={isConverted}
      idParam={{ leadId }}
      labels={LEAD_ICP_LABELS}
      hooks={{
        useLinks: useLeadICPs,
        useLink: useLinkLeadToICP,
        useUpdate: useUpdateLeadICP,
        useUnlink: useUnlinkLeadFromICP,
      }}
    />
  );
}
