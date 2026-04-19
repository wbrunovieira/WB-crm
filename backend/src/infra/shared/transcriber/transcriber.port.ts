export interface TranscriptionJob {
  jobId: string;
  status: "pending" | "processing" | "done" | "failed";
  error?: string;
}

export interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
}

export interface TranscriptionResult {
  jobId: string;
  text: string;
  language: string;
  durationSeconds: number;
  segments: TranscriptionSegment[];
}

export abstract class TranscriberPort {
  abstract submitAudio(buffer: Buffer, fileName: string): Promise<{ jobId: string }>;
  abstract submitVideo(buffer: Buffer, fileName: string): Promise<{ jobId: string }>;
  abstract getStatus(jobId: string): Promise<TranscriptionJob>;
  abstract getResult(jobId: string): Promise<TranscriptionResult>;
}
