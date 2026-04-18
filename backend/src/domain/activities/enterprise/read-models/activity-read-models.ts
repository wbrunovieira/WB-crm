export interface ActivitySummary {
  id: string;
  ownerId: string;
  type: string;
  subject: string;
  description: string | null;
  dueDate: Date | null;
  completed: boolean;
  completedAt: Date | null;
  failedAt: Date | null;
  failReason: string | null;
  skippedAt: Date | null;
  skipReason: string | null;
  dealId: string | null;
  additionalDealIds: string | null;
  contactId: string | null;
  contactIds: string | null;
  leadContactIds: string | null;
  leadId: string | null;
  partnerId: string | null;
  callContactType: string | null;
  meetingNoShow: boolean;
  gotoCallId: string | null;
  gotoCallOutcome: string | null;
  gotoDuration: number | null;
  gotoTranscriptText: string | null;
  createdAt: Date;
  updatedAt: Date;

  // Relations
  owner: { id: string; name: string; email: string } | null;
  deal: { id: string; title: string; organization: { id: string; name: string } | null } | null;
  contact: { id: string; name: string; organization: { id: string; name: string } | null; partner: { id: string; name: string } | null } | null;
  lead: { id: string; businessName: string; isArchived: boolean; starRating: number | null } | null;
  partner: { id: string; name: string } | null;
  cadenceActivity: { id: string; leadCadence: { cadence: { id: string; name: string; icp: { id: string; name: string } | null } } } | null;
}

export interface ActivityDetail extends ActivitySummary {
  gotoRecordingId: string | null;
  gotoRecordingDriveId: string | null;
  gotoRecordingUrl: string | null;
  gotoRecordingUrl2: string | null;
  gotoTranscriptionJobId: string | null;
  gotoTranscriptionJobId2: string | null;
  emailMessageId: string | null;
  emailThreadId: string | null;
  emailSubject: string | null;
  emailFromAddress: string | null;
  emailFromName: string | null;
  emailReplied: boolean;
  emailTrackingToken: string | null;
  emailOpenCount: number;
  emailOpenedAt: Date | null;
  emailLastOpenedAt: Date | null;
  emailLinkClickCount: number;
  emailLinkClickedAt: Date | null;
  emailLastLinkClickedAt: Date | null;

  // Extra resolved contacts
  contacts: Array<{ id: string; name: string; email: string | null; phone: string | null }>;

  whatsappMessages: Array<{
    id: string;
    fromMe: boolean;
    pushName: string | null;
    timestamp: number;
    messageType: string;
    mediaDriveId: string | null;
    mediaMimeType: string | null;
    mediaLabel: string | null;
    mediaTranscriptText: string | null;
  }>;
}
