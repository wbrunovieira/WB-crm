export interface GatekeeperAnalysisPayload {
  jobId: string;
  webhookUrl: string;
  transcript: string;
  callDurationSeconds?: number;
  callDate?: string;
  lead: {
    id: string;
    businessName: string;
    segment?: string;
    city?: string;
  };
  contact?: {
    name?: string;
    role?: string;
  };
  activity: {
    id: string;
    subject: string;
  };
}

export abstract class GatekeeperAnalysisAgentPort {
  abstract request(payload: GatekeeperAnalysisPayload): Promise<void>;
}
