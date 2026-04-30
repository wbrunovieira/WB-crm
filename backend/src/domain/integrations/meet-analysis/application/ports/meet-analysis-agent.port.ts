export interface MeetAnalysisPayload {
  jobId: string;
  webhookUrl: string;
  transcript: string;
  meetingDurationSeconds?: number;
  meetingDate?: string;
  meetingTitle?: string;
  lead: {
    id: string;
    businessName: string;
    description?: string | null;
    segment?: string | null;
    city?: string | null;
  };
  contact?: {
    name?: string | null;
    role?: string | null;
  };
  activity: {
    id: string;
    subject: string;
    notes?: string | null;
  };
}

export abstract class MeetAnalysisAgentPort {
  abstract request(payload: MeetAnalysisPayload): Promise<void>;
}
