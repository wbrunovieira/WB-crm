import type { WhatsAppMediaMessage } from "@/components/whatsapp/WhatsAppMessageLog";

export type LeadContact = {
  id: string;
  name: string;
  role: string | null;
  isPrimary: boolean;
  isActive: boolean;
};

export type Activity = {
  id: string;
  type: string;
  subject: string;
  description: string | null;
  dueDate: Date | string | null;
  completed: boolean;
  completedAt?: Date | string | null;
  failedAt?: Date | string | null;
  failReason?: string | null;
  skippedAt?: Date | string | null;
  skipReason?: string | null;
  leadContactIds?: string | null;
  callContactType?: string | null;
  gotoCallId?: string | null;
  gotoRecordingUrl?: string | null;
  gotoRecordingUrl2?: string | null;
  gotoTranscriptText?: string | null;
  gotoCallOutcome?: string | null;
  whatsappMessages?: WhatsAppMediaMessage[];
  // Campos de e-mail
  emailThreadId?: string | null;
  emailSubject?: string | null;
  emailFromAddress?: string | null;
  emailFromName?: string | null;
  emailReplied?: boolean | null;
  emailOpenCount?: number | null;
  emailOpenedAt?: string | null;
  emailLinkClickCount?: number | null;
  emailLinkClickedAt?: string | null;
  emailToAddress?: string | null;
  clickUrls?: Array<{ url: string; count: number }> | null;
};

export type CallAnalysisSummary = { id: string; score: number | null; status: string };
export type MeetAnalysisSummary = { id: string; score: number | null; status: string };
export type GkAnalysisSummary = { id: string; score: number | null; status: string };
export type TransferAnalysisSummary = { gkId: string; gkScore: number | null; gkStatus: string; spicedId: string; spicedScore: number | null; spicedStatus: string };
