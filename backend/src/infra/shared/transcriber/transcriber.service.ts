import { Injectable } from "@nestjs/common";
import { TranscriberPort, TranscriptionJob, TranscriptionResult } from "./transcriber.port";

@Injectable()
export class TranscriberService extends TranscriberPort {
  private baseUrl(): string {
    return process.env.TRANSCRIPTOR_BASE_URL ?? "https://transcritor.wbdigitalsolutions.com";
  }

  private headers(): Record<string, string> {
    return { "X-API-Key": process.env.TRANSCRIPTOR_API_KEY ?? "" };
  }

  async submitAudio(buffer: Buffer, fileName: string): Promise<{ jobId: string }> {
    const formData = new FormData();
    formData.append(
      "file",
      new File([new Uint8Array(buffer)], fileName, { type: "audio/mpeg" }),
    );

    const res = await fetch(`${this.baseUrl()}/transcriptions/audio`, {
      method: "POST",
      headers: this.headers(),
      body: formData,
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Transcriptor audio upload failed ${res.status}: ${body}`);
    }

    const data = await res.json() as { job_id: string };
    return { jobId: data.job_id };
  }

  async submitVideo(buffer: Buffer, fileName: string): Promise<{ jobId: string }> {
    const formData = new FormData();
    formData.append(
      "file",
      new Blob([new Uint8Array(buffer)], { type: "video/mp4" }),
      fileName,
    );

    const res = await fetch(`${this.baseUrl()}/transcriptions/video`, {
      method: "POST",
      headers: this.headers(),
      body: formData,
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Transcriptor video upload failed ${res.status}: ${body}`);
    }

    const data = await res.json() as { job_id: string };
    return { jobId: data.job_id };
  }

  async getStatus(jobId: string): Promise<TranscriptionJob> {
    const res = await fetch(`${this.baseUrl()}/transcriptions/${jobId}`, {
      headers: this.headers(),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Transcriptor status check failed ${res.status}: ${body}`);
    }

    const data = await res.json() as {
      job_id: string;
      status: "pending" | "processing" | "done" | "failed";
      error?: string;
    };

    return {
      jobId: data.job_id,
      status: data.status,
      error: data.error,
    };
  }

  async getResult(jobId: string): Promise<TranscriptionResult> {
    const res = await fetch(`${this.baseUrl()}/transcriptions/${jobId}/result`, {
      headers: this.headers(),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Transcriptor result fetch failed ${res.status}: ${body}`);
    }

    const data = await res.json() as {
      job_id: string;
      text: string;
      language: string;
      duration_seconds: number;
      segments?: Array<{ start: number; end: number; text: string }>;
    };

    return {
      jobId: data.job_id,
      text: data.text,
      language: data.language,
      durationSeconds: data.duration_seconds,
      segments: data.segments ?? [],
    };
  }
}
