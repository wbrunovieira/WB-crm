export interface PartnerActivity {
  id: string;
  type: string;
  subject: string;
  description: string | null;
  completed: boolean;
  completedAt: Date | null;
  dueDate: Date | null;
  createdAt: Date;
  failedAt: Date | null;
  failReason: string | null;
  skippedAt: Date | null;
  skipReason: string | null;
  contactId: string | null;
  leadContactIds: string | null;
  callContactType: string | null;
  gotoCallId: string | null;
  gotoCallOutcome: string | null;
  gotoDuration: number | null;
  gotoRecordingUrl: string | null;
  gotoRecordingUrl2: string | null;
  gotoTranscriptText: string | null;
  emailThreadId: string | null;
  emailSubject: string | null;
  emailFromAddress: string | null;
  emailFromName: string | null;
  emailReplied: boolean;
  emailOpenCount: number;
  emailOpenedAt: Date | null;
  emailLinkClickCount: number;
  emailLinkClickedAt: Date | null;
  emailToAddress: string | null;
  clickUrls: Array<{ url: string; count: number }>;
}

export interface PartnerSummary {
  id: string;
  ownerId: string;
  name: string;
  legalName: string | null;
  partnerType: string;
  partnerStatus: string;
  partnershipStartedAt: Date | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  industry: string | null;
  expertise: string | null;
  companySize: string | null;
  starRating: number | null;
  lastContactDate: Date | null;
  createdAt: Date;
  updatedAt: Date;

  // Relations
  owner: { id: string; name: string; email: string } | null;
  _count: { contacts: number; activities: number; referredLeads: number };
}

export interface PartnerDetail extends PartnerSummary {
  // Additional scalar fields
  foundationDate: Date | null;
  website: string | null;
  whatsapp: string | null;
  zipCode: string | null;
  streetAddress: string | null;
  employeeCount: number | null;
  description: string | null;
  notes: string | null;
  languages: string | null;
  linkedin: string | null;
  instagram: string | null;
  facebook: string | null;
  twitter: string | null;

  // Economic activity
  primaryCNAE: { id: string; code: string; description: string } | null;
  internationalActivity: string | null;

  // Verification (email + phone/whatsapp format)
  emailVerified: boolean | null;
  emailVerifiedAt: Date | null;
  emailVerificationStatus: string | null;
  emailVerificationReason: string | null;
  phoneValid: boolean | null;
  phoneType: string | null;
  whatsappPhoneValid: boolean | null;
  whatsappPhoneType: string | null;

  // Relations
  contacts: Array<{
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    whatsapp: string | null;
    role: string | null;
    isPrimary: boolean;
    linkedin: string | null;
    instagram: string | null;
    status: string;
  }>;
  activities: PartnerActivity[];
  /** Most recent contact-type activity date (derived), for the "last contact" alert. */
  lastContactAt: Date | null;
  referredLeads: Array<{
    id: string;
    businessName: string;
    status: string;
    convertedToOrganizationId: string | null;
    createdAt: Date;
  }>;
}
