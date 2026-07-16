"use client";

import {
  useOrgICPs,
  useLinkOrgToICP,
  useUpdateOrgICP,
  useUnlinkOrgFromICP,
} from "@/hooks/icps/use-icps";
import { EntityICPSection, type EntityICPLabels } from "./EntityICPSection";

const ORGANIZATION_ICP_LABELS: EntityICPLabels = {
  emptyState: "Nenhum ICP vinculado a esta organização.",
  notesTip: "Notas adicionais sobre a organização",
  fitStatusTip: "Quão bem a organização se encaixa no perfil ideal",
  businessMomentTip: "Em qual fase do negócio a organização está",
  platformsTip: "Quais plataformas a organização usa atualmente",
  strategicDesireTip: "O que a organização deseja alcançar",
  painTip: "Principal dor/problema declarado",
  fragmentationTip: "Quão fragmentada está a operação (0=unificada, 10=muito fragmentada)",
  purchaseTriggerTip: "O que motivou a buscar uma solução agora",
  decisionTimeTip: "Estimativa de quando vai tomar a decisão",
  complexityTip: "Complexidade técnica percebida (1=simples, 5=muito complexa)",
};

interface OrganizationICPSectionProps {
  organizationId: string;
}

export function OrganizationICPSection({ organizationId }: OrganizationICPSectionProps) {
  return (
    <EntityICPSection
      entityId={organizationId}
      idParam={{ orgId: organizationId }}
      labels={ORGANIZATION_ICP_LABELS}
      hooks={{
        useLinks: useOrgICPs,
        useLink: useLinkOrgToICP,
        useUpdate: useUpdateOrgICP,
        useUnlink: useUnlinkOrgFromICP,
      }}
    />
  );
}
