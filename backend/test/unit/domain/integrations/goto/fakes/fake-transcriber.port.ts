import { TranscriberPort, TranscriberCallbackOptions, TranscriptionJob, TranscriptionResult } from "@/infra/shared/transcriber/transcriber.port";

export class FakeTranscriberPort extends TranscriberPort {
  public submittedJobs: Array<{ buffer: Buffer; fileName: string; type: "audio" | "video"; callbackUrl?: string }> = [];
  public jobStatuses: Map<string, TranscriptionJob> = new Map();
  public jobResults: Map<string, TranscriptionResult> = new Map();
  public nextJobId = "job-001";

  setNextJobId(id: string): void {
    this.nextJobId = id;
  }

  addJobStatus(jobId: string, status: TranscriptionJob): void {
    this.jobStatuses.set(jobId, status);
  }

  addJobResult(jobId: string, result: TranscriptionResult): void {
    this.jobResults.set(jobId, result);
  }

  async submitAudio(buffer: Buffer, fileName: string, callback?: TranscriberCallbackOptions): Promise<{ jobId: string }> {
    this.submittedJobs.push({ buffer, fileName, type: "audio", callbackUrl: callback?.callbackUrl });
    const jobId = this.nextJobId;
    return { jobId };
  }

  async submitVideo(buffer: Buffer, fileName: string, callback?: TranscriberCallbackOptions): Promise<{ jobId: string }> {
    this.submittedJobs.push({ buffer, fileName, type: "video", callbackUrl: callback?.callbackUrl });
    const jobId = this.nextJobId;
    return { jobId };
  }

  async getStatus(jobId: string): Promise<TranscriptionJob> {
    return this.jobStatuses.get(jobId) ?? { jobId, status: "done" };
  }

  async getResult(jobId: string): Promise<TranscriptionResult> {
    const result = this.jobResults.get(jobId);
    if (!result) throw new Error(`No result for job ${jobId}`);
    return result;
  }
}
