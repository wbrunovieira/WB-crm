import { TranscriberPort, TranscriptionJob, TranscriptionResult } from "@/infra/shared/transcriber/transcriber.port";

export class FakeTranscriberPort extends TranscriberPort {
  public jobStatuses: Map<string, TranscriptionJob> = new Map();
  public jobResults: Map<string, string> = new Map();
  public submittedJobs: { jobId: string; fileName: string }[] = [];

  async submitAudio(_buffer: Buffer, fileName: string): Promise<{ jobId: string }> {
    const jobId = `job-audio-${Date.now()}`;
    this.submittedJobs.push({ jobId, fileName });
    this.jobStatuses.set(jobId, { jobId, status: "pending" });
    return { jobId };
  }

  async submitVideo(_buffer: Buffer, fileName: string): Promise<{ jobId: string }> {
    const jobId = `job-video-${Date.now()}`;
    this.submittedJobs.push({ jobId, fileName });
    this.jobStatuses.set(jobId, { jobId, status: "pending" });
    return { jobId };
  }

  async getStatus(jobId: string): Promise<TranscriptionJob> {
    return this.jobStatuses.get(jobId) ?? { jobId, status: "pending" };
  }

  async getResult(jobId: string): Promise<TranscriptionResult> {
    const text = this.jobResults.get(jobId) ?? "transcrição fake";
    return { jobId, text, language: "pt", durationSeconds: 60, segments: [] };
  }

  setStatus(jobId: string, status: TranscriptionJob["status"], error?: string): void {
    this.jobStatuses.set(jobId, { jobId, status, error });
  }

  setResult(jobId: string, text: string): void {
    this.jobResults.set(jobId, text);
  }
}
