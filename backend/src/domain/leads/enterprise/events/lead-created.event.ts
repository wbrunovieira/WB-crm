/**
 * Emitted (via EventEmitter2, event name "lead.created") right after a Lead is
 * persisted by CreateLeadUseCase. Carries everything a listener needs so it never
 * has to depend on the Leads module (avoids a circular import with EmailModule).
 */
export interface LeadCreatedPayload {
  leadId: string;
  creatorId: string; // the user who created it (ownerId) — used to detect the bot
  businessName: string;
}

export class LeadCreatedEvent {
  constructor(public readonly payload: LeadCreatedPayload) {}
}

export const LEAD_CREATED_EVENT = "lead.created";
