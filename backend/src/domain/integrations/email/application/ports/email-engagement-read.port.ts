/**
 * Read-model resolved from the Activity behind a tracking token, used to decide
 * whether (and to whom) an engagement notification should fire when a direct
 * (non-campaign) email is opened or clicked.
 */
export interface EmailEngagementContext {
  activityId: string;
  /** Owner of the activity — the salesperson who sent the email and should be notified. */
  ownerId: string;
  /** True when the email belongs to a campaign — these are excluded to avoid notification noise. */
  isCampaign: boolean;
  subject: string | null;
  /** Resolved display name of the recipient entity (lead/contact/org/partner), if any. */
  recipientName: string | null;
  leadId?: string;
  organizationId?: string;
  contactId?: string;
  partnerId?: string;
}

export abstract class EmailEngagementReadPort {
  abstract findContextByToken(token: string): Promise<EmailEngagementContext | null>;
}
