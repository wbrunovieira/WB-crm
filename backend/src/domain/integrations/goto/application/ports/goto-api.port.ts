export interface GoToRecording {
  id: string;
  startTimestamp: string;
  transcriptEnabled: boolean;
}

export interface GoToCallParticipantType {
  value: "LINE" | "PHONE_NUMBER";
  lineId?: string;
  extensionNumber?: string;
  userId?: string;
  userKey?: string;
  phoneNumberId?: string;
  number?: string;
  callee?: { name: string; number: string };
}

export interface GoToCallParticipant {
  id: string;
  legId: string;
  type: GoToCallParticipantType;
  causeCode?: number;
  recordings?: GoToRecording[];
}

export interface GoToCallReport {
  conversationSpaceId: string;
  accountKey: string;
  direction: "INBOUND" | "OUTBOUND";
  callCreated: string; // ISO-8601
  callEnded: string;   // ISO-8601
  participants: GoToCallParticipant[];
  callStates?: unknown[];
}

export abstract class GoToApiPort {
  abstract fetchCallReport(conversationSpaceId: string, accessToken: string): Promise<GoToCallReport | null>;
  abstract fetchReportsSince(accessToken: string, since: string): Promise<GoToCallReport[]>;
  abstract refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string; expiresAt: number }>;
}
