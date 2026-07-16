"use client";

import {
  usePartnerICPs,
  useLinkPartnerToICP,
  useUpdatePartnerICP,
  useUnlinkPartnerFromICP,
} from "@/hooks/icps/use-icps";
import { EntityICPSection, type EntityICPLabels } from "./EntityICPSection";

const PARTNER_ICP_LABELS: EntityICPLabels = {
  emptyState: "Nenhum ICP vinculado a este parceiro.",
  notesTip: "Notas adicionais sobre o parceiro",
  fitStatusTip: "Quão bem o parceiro se encaixa no perfil ideal",
  businessMomentTip: "Em qual fase do negócio o parceiro está",
  platformsTip: "Quais plataformas o parceiro usa atualmente",
  strategicDesireTip: "O que o parceiro deseja alcançar",
  painTip: "Principal dor/problema declarado",
  fragmentationTip: "Quão fragmentada está a operação (0=unificada, 10=muito fragmentada)",
  purchaseTriggerTip: "O que motivou a buscar uma solução agora",
  decisionTimeTip: "Estimativa de quando vai tomar a decisão",
  complexityTip: "Complexidade técnica percebida (1=simples, 5=muito complexa)",
};

interface PartnerICPSectionProps {
  partnerId: string;
}

export function PartnerICPSection({ partnerId }: PartnerICPSectionProps) {
  return (
    <EntityICPSection
      entityId={partnerId}
      idParam={{ partnerId }}
      labels={PARTNER_ICP_LABELS}
      hooks={{
        useLinks: usePartnerICPs,
        useLink: useLinkPartnerToICP,
        useUpdate: useUpdatePartnerICP,
        useUnlink: useUnlinkPartnerFromICP,
      }}
    />
  );
}
