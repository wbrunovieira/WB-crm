export interface Campaign {
  id: string;
  name: string;
  description?: string;
  fromEmail: string;
  status: string;
  createdAt: string;
}

/** Localized versions of a step. Keyed by language (en/es/it); pt is the base subject/bodyHtml. */
export type StepTranslations = Record<string, { subject: string; bodyHtml: string }>;

export interface CampaignStep {
  id?: string;
  order: number;
  subject: string;
  bodyHtml: string;
  delayDays: number;
  translations?: StepTranslations;
}

/** Languages a campaign step can be written in. pt = the base step content. */
export const CAMPAIGN_LANGS: { code: string; label: string }[] = [
  { code: "pt", label: "Português" },
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "it", label: "Italiano" },
];

export interface CampaignStats {
  campaignId: string;
  steps: {
    order: number;
    subject: string;
    sent: number;
    opened: number;
    clicked: number;
    openRate: number;
    clickRate: number;
  }[];
  recipients: { total: number; pending: number; active: number; completed: number; unsubscribed: number; bounced: number };
  totals: { sent: number; uniqueOpened: number; uniqueClicked: number; openRate: number; clickRate: number; bounceRate: number; unsubscribeRate: number };
  bySegment: { segment: string; total: number }[];
  byRole: { role: string; total: number }[];
  byRecipientType: { type: string; total: number }[];
}

export interface Suppression {
  id: string;
  email: string;
  reason: string;
  createdAt: string;
  leadName?: string | null;
  contactName?: string | null;
}

export interface EmailTemplate {
  name: string;
  label: string;
}

export interface RecipientCandidate {
  key: string;
  entityType: "lead" | "organization";
  entityId: string;
  name: string;
  email?: string;
  emailCount: number;
  previewEmails: string[];
}

export interface Props {
  campaigns: Campaign[];
  suppressions: Suppression[];
}

export type Tab = "campanhas" | "metricas" | "criar" | "suppressions" | "progresso";
export type EnrollMode = "todos" | "sourceGroup" | "buscar";
