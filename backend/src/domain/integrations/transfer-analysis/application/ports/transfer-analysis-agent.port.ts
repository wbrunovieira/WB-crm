export interface TransferAnalysisPayload {
  gkJobId: string;
  spicedJobId: string;
  gkWebhookUrl: string;
  spicedWebhookUrl: string;
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

export abstract class TransferAnalysisAgentPort {
  abstract request(payload: TransferAnalysisPayload): Promise<void>;
}
