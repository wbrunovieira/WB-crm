export interface GatekeeperBatchAnalysisEntry {
  activityId: string;
  score?: number;
  summary?: string;
  raportRecepcao?: object;
  raportAlianca?: object;
  raportPerguntas?: object;
  raportObjecoes?: object;
  raportResultado?: object;
  raportTecnicas?: object;
}

export interface GatekeeperBatchHistoricalSummary {
  date?: string;
  summary: string;
  overallScore?: number;
}

export interface GatekeeperBatchPayload {
  batchJobId: string;
  webhookUrl: string;
  analyses: GatekeeperBatchAnalysisEntry[];
  historicalSummaries: GatekeeperBatchHistoricalSummary[];
}

export abstract class GatekeeperBatchAgentPort {
  abstract request(payload: GatekeeperBatchPayload): Promise<void>;
}
