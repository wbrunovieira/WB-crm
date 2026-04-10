// GoTo Connect API — TypeScript types

// ─── OAuth ───────────────────────────────────────────────────────────────────

export interface GoToTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number; // seconds
  refresh_token?: string;
  scope?: string;
  account_key?: string;
  organizer_key?: string;
  principal?: string;
}

export interface GoToStoredTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number; // unix timestamp ms
  accountKey?: string;
}

// ─── Notification Channel ─────────────────────────────────────────────────────

export interface GoToChannelResponse {
  channelId: string;
  channelType: "Webhook" | "WebSocket";
  webhookUrl?: string;
}

export interface GoToSubscriptionRequest {
  channelId: string;
  accountKeys: Array<{
    id: string;
    events?: string[];
  }>;
}

export interface GoToSubscriptionResponse {
  subscriptionId: string;
  channelId: string;
}

// ─── Call Events ──────────────────────────────────────────────────────────────

export type GoToCallEventType = "STARTING" | "ACTIVE" | "ENDING";

export type GoToParticipantStatus = "RINGING" | "CONNECTED" | "DISCONNECTED";

export type GoToParticipantType = "LINE" | "PHONE_NUMBER";

export interface GoToParticipant {
  participantId: string;
  legId: string;
  originator?: string;
  status: { value: GoToParticipantStatus };
  type: {
    value: GoToParticipantType;
    lineId?: string;
    extensionNumber?: string;
    phoneNumber?: string;
  };
}

export interface GoToCallEventState {
  id: string;
  sequenceNumber: number;
  type: GoToCallEventType;
  timestamp: string; // ISO-8601
  participants: GoToParticipant[];
}

export interface GoToCallEventMetadata {
  conversationSpaceId: string;
  direction: "INBOUND" | "OUTBOUND";
  accountKey: string;
  callCreated: string; // ISO-8601
  truncated?: boolean;
}

export interface GoToCallEvent {
  metadata: GoToCallEventMetadata;
  state: GoToCallEventState;
}

// ─── Call Events Report ───────────────────────────────────────────────────────

export interface GoToRecording {
  id: string;
  startTimestamp: string;
  transcriptEnabled: boolean;
}

export interface GoToReportParticipantType {
  value: "LINE" | "PHONE_NUMBER";
  // LINE fields
  lineId?: string;
  extensionNumber?: string;
  userId?: string;
  userKey?: string;
  // PHONE_NUMBER fields
  phoneNumberId?: string;
  number?: string; // GoTo system number used
  callee?: { name: string; number: string }; // actual dialed (OUTBOUND) or caller (INBOUND)
}

export interface GoToReportParticipant {
  id: string;
  legId: string;
  type: GoToReportParticipantType;
  causeCode?: number; // ISDN Q.850 — 16=answered, 17=busy, 18/19=no answer
  recordings?: GoToRecording[];
}

export interface GoToCallReport {
  conversationSpaceId: string;
  accountKey: string;
  direction: "INBOUND" | "OUTBOUND";
  callCreated: string; // ISO-8601
  callEnded: string; // ISO-8601
  participants: GoToReportParticipant[];
  callStates?: unknown[];
}

// ─── Webhook Payload ──────────────────────────────────────────────────────────

export type GoToWebhookEventType =
  | "STARTING"
  | "ACTIVE"
  | "ENDING"
  | "REPORT_SUMMARY";

export interface GoToWebhookPayload {
  eventType?: GoToWebhookEventType;
  // Call event (STARTING, ACTIVE, ENDING)
  callEvent?: GoToCallEvent;
  // Report summary notification (contains conversationSpaceId to fetch full report)
  reportSummary?: {
    conversationSpaceId: string;
    accountKey: string;
    callCreated: string;
    callEnded: string;
  };
}
