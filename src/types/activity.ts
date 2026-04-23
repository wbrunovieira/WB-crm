export interface ActivityContact {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  organization?: { id: string; name: string } | null;
  partner?: { id: string; name: string } | null;
}

export interface ActivityDeal {
  id: string;
  title: string;
  organization?: { id: string; name: string } | null;
}

export interface ActivityOwner {
  id: string;
  name: string;
  email?: string | null;
}

export interface ActivityPartner {
  id: string;
  name: string;
}

export interface ActivityCadenceInfo {
  id: string;
  name: string;
  icp?: { name: string } | null;
}

export interface ActivityCadence {
  leadCadence?: {
    cadence?: ActivityCadenceInfo;
  };
}

export interface Activity {
  id: string;
  type: string;
  subject: string;
  description: string | null;
  dueDate: string | null;
  completed: boolean;
  completedAt?: string | Date | null;
  createdAt?: string | Date | null;
  ownerId?: string;
  owner?: ActivityOwner | null;
  contactId?: string | null;
  contactIds?: string | null;
  leadContactIds?: string | null;
  leadId?: string | null;
  organizationId?: string | null;
  dealId?: string | null;
  partnerId?: string | null;
  contact?: ActivityContact | null;
  contacts?: ActivityContact[];
  deal?: ActivityDeal | null;
  lead?: { id: string; businessName: string } | null;
  partner?: ActivityPartner | null;
  callContactType?: string | null;
  meetingNoShow?: boolean;
  gotoCallId?: string | null;
  gotoCallOutcome?: string | null;
  gotoDuration?: number | null;
  gotoRecordingUrl?: string | null;
  gotoRecordingUrl2?: string | null;
  gotoTranscriptText?: string | null;
  emailMessageId?: string | null;
  emailThreadId?: string | null;
  emailSubject?: string | null;
  emailFromAddress?: string | null;
  emailFromName?: string | null;
  emailReplied?: boolean | null;
  whatsAppMessageId?: string | null;
  whatsAppRemoteJid?: string | null;
  failedAt?: string | null;
  skippedAt?: string | null;
  failReason?: string | null;
  skipReason?: string | null;
  cadenceActivity?: ActivityCadence | null;
}
