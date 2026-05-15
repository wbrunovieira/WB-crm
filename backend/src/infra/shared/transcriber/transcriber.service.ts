import { Injectable, Logger } from "@nestjs/common";
import { execFile } from "child_process";
import { tmpdir } from "os";
import { join } from "path";
import { writeFile, readFile, unlink } from "fs/promises";
import { randomUUID } from "crypto";
import { TranscriberPort, TranscriberCallbackOptions, TranscriptionJob, TranscriptionResult } from "./transcriber.port";

async function toMp3IfNeeded(buffer: Buffer, fileName: string): Promise<{ buffer: Buffer; fileName: string }> {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  const unsupported = ["webm"];
  if (!unsupported.includes(ext)) return { buffer, fileName };

  const id = randomUUID();
  const inputPath = join(tmpdir(), `wa_${id}.${ext}`);
  const outputPath = join(tmpdir(), `wa_${id}.mp3`);

  await writeFile(inputPath, buffer);

  await new Promise<void>((resolve, reject) => {
    execFile("ffmpeg", ["-y", "-i", inputPath, "-q:a", "4", outputPath], (_err, _stdout, stderr) => {
      if (_err) reject(new Error(stderr || _err.message));
      else resolve();
    });
  });

  const mp3Buffer = await readFile(outputPath);
  await unlink(inputPath).catch(() => {});
  await unlink(outputPath).catch(() => {});

  const baseName = fileName.replace(/\.[^.]+$/, "");
  return { buffer: mp3Buffer, fileName: `${baseName}.mp3` };
}

@Injectable()
export class TranscriberService extends TranscriberPort {
  private readonly logger = new Logger(TranscriberService.name);

  private baseUrl(): string {
    return process.env.TRANSCRIPTOR_BASE_URL ?? "https://transcritor.wbdigitalsolutions.com";
  }

  private headers(): Record<string, string> {
    return { "X-API-Key": process.env.TRANSCRIPTOR_API_KEY ?? "" };
  }

  async submitAudio(buffer: Buffer, fileName: string, callback?: TranscriberCallbackOptions): Promise<{ jobId: string }> {
    let finalBuffer = buffer;
    let finalFileName = fileName;
    try {
      ({ buffer: finalBuffer, fileName: finalFileName } = await toMp3IfNeeded(buffer, fileName));
      if (finalFileName !== fileName) {
        this.logger.log(`Converted ${fileName} → ${finalFileName} for transcription`);
      }
    } catch (err) {
      this.logger.warn(`Audio conversion failed, using original: ${err instanceof Error ? err.message : err}`);
    }

    const formData = new FormData();
    formData.append(
      "file",
      new File([new Uint8Array(finalBuffer)], finalFileName, { type: "audio/mpeg" }),
    );
    if (callback?.callbackUrl) {
      formData.append("callback_url", callback.callbackUrl);
      if (callback.callbackSecret) formData.append("callback_secret", callback.callbackSecret);
    }

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

  async submitVideo(buffer: Buffer, fileName: string, callback?: TranscriberCallbackOptions): Promise<{ jobId: string }> {
    const formData = new FormData();
    formData.append(
      "file",
      new Blob([new Uint8Array(buffer)], { type: "video/mp4" }),
      fileName,
    );
    if (callback?.callbackUrl) {
      formData.append("callback_url", callback.callbackUrl);
      if (callback.callbackSecret) formData.append("callback_secret", callback.callbackSecret);
    }

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
