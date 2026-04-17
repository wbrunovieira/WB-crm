export interface ContactSummary {
  id: string;
  ownerId: string;
  name: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  role: string | null;
  department: string | null;
  isPrimary: boolean;
  status: string;
  organization: { id: string; name: string } | null;
  lead: { id: string; businessName: string } | null;
  partner: { id: string; name: string } | null;
  owner: { id: string; name: string } | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContactActivity {
  id: string;
  type: string;
  /** Maps to Activity.subject — used by ActivityTimeline */
  subject: string;
  description: string | null;
  dueDate: Date | null;
  completed: boolean;
  completedAt: Date | null;
  createdAt: Date;
  contactId: string | null;
  leadId: string | null;
  dealId: string | null;
  partnerId: string | null;
  whatsappMessages: Array<{
    id: string;
    fromMe: boolean;
    pushName: string | null;
    timestamp: Date;
    messageType: string;
    mediaDriveId: string | null;
    mediaMimeType: string | null;
    mediaLabel: string | null;
    mediaTranscriptText: string | null;
  }>;
}

export interface ContactDetail extends ContactSummary {
  whatsappVerified: boolean;
  whatsappVerifiedAt: Date | null;
  whatsappVerifiedNumber: string | null;
  linkedin: string | null;
  instagram: string | null;
  birthDate: Date | null;
  notes: string | null;
  preferredLanguage: string | null;
  /** Raw JSON string stored in DB — parsed by LanguageBadges */
  languages: string | null;
  source: string | null;
  leadId: string | null;
  organizationId: string | null;
  partnerId: string | null;
  deals: Array<{ id: string; title: string; stage: { name: string } }>;
  activities: ContactActivity[];
  owner: { id: string; name: string; email: string } | null;
}
