/** Read models que espelham o retorno do NestJS backend */

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
  createdAt: string;
  updatedAt: string;
}

export interface ContactDetail extends ContactSummary {
  whatsappVerified: boolean;
  whatsappVerifiedAt: string | null;
  whatsappVerifiedNumber: string | null;
  linkedin: string | null;
  instagram: string | null;
  birthDate: string | null;
  notes: string | null;
  preferredLanguage: string | null;
  /** JSON string armazenado no banco — parseado pelo LanguageBadges */
  languages: string | null;
  source: string | null;
  leadId: string | null;
  organizationId: string | null;
  partnerId: string | null;
  sourceLeadContactId: string | null;
  deals: Array<{ id: string; title: string; stage: { name: string } }>;
  activities: Array<{
    id: string;
    type: string;
    subject: string;
    description: string | null;
    dueDate: string | null;
    completedAt: string | null;
    completed: boolean;
    createdAt: string;
    contactId: string | null;
    leadId: string | null;
    dealId: string | null;
    partnerId: string | null;
    whatsappMessages: Array<{
      id: string;
      fromMe: boolean;
      pushName: string | null;
      timestamp: Date | string;
      messageType: string;
      mediaDriveId: string | null;
      mediaMimeType: string | null;
      mediaLabel: string | null;
      mediaTranscriptText: string | null;
    }>;
  }>;
  owner: { id: string; name: string; email: string } | null;
}
