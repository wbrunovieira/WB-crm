export interface CallAnalysisPayload {
  jobId: string;
  webhookUrl: string;
  transcript: string;
  callDurationSeconds?: number;
  callDate?: string;
  lead: {
    id: string;
    businessName: string;
    description?: string | null;
    segment?: string | null;
    city?: string | null;
    activities?: string | null;
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

export abstract class CallAnalysisAgentPort {
  abstract request(payload: CallAnalysisPayload): Promise<void>;
}
