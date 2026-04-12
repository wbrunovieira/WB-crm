/**
 * Transcriptor API Client
 *
 * Integrates with the WB transcription service at transcritor.wbdigitalsolutions.com
 * Async flow: submit video → get job_id → poll status → fetch result when done
 */

// Read env vars lazily at call time so tests can set them in beforeEach
function baseUrl(): string {
  return (
    process.env.TRANSCRIPTOR_BASE_URL ?? "https://transcritor.wbdigitalsolutions.com"
  );
}

function headers(): Record<string, string> {
  return { "X-API-Key": process.env.TRANSCRIPTOR_API_KEY ?? "" };
}

// ---------------------------------------------------------------------------
// Types

export interface TranscriptionJob {
  jobId: string;
  status: "pending" | "processing" | "done" | "failed";
  createdAt?: string;
  completedAt?: string | null;
  error?: string;
}

export interface TranscriptionResult {
  jobId: string;
  text: string;
  language: string;
  durationSeconds: number;
}

// ---------------------------------------------------------------------------
// submitVideoForTranscription
//
// Uploads a video Buffer to the transcriptor API.
// Returns { jobId, status: "pending" }.

export async function submitVideoForTranscription(
  buffer: Buffer,
  fileName: string
): Promise<{ jobId: string; status: string }> {
  const formData = new FormData();
  // Convert Buffer to Uint8Array so Blob constructor accepts it regardless of TS strict types
  formData.append("file", new Blob([new Uint8Array(buffer)], { type: "video/mp4" }), fileName);

  const res = await fetch(`${baseUrl()}/transcriptions/video`, {
    method: "POST",
    headers: headers(),
    body: formData,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Transcriptor upload failed ${res.status}: ${body}`);
  }

  const data = await res.json();
  return { jobId: data.job_id, status: data.status };
}

// ---------------------------------------------------------------------------
// getTranscriptionStatus
//
// Polls the status of a transcription job.

export async function getTranscriptionStatus(jobId: string): Promise<TranscriptionJob> {
  const res = await fetch(`${baseUrl()}/transcriptions/${jobId}`, {
    headers: headers(),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Transcriptor status check failed ${res.status}: ${body}`);
  }

  const data = await res.json();
  return {
    jobId: data.job_id,
    status: data.status,
    createdAt: data.created_at,
    completedAt: data.completed_at,
    error: data.error,
  };
}

// ---------------------------------------------------------------------------
// getTranscriptionResult
//
// Fetches the final transcript text. Only call when status = "done".
// Throws if called before done (API returns 409).

export async function getTranscriptionResult(jobId: string): Promise<TranscriptionResult> {
  const res = await fetch(`${baseUrl()}/transcriptions/${jobId}/result`, {
    headers: headers(),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Transcriptor result fetch failed ${res.status}: ${body}`);
  }

  const data = await res.json();
  return {
    jobId: data.job_id,
    text: data.text,
    language: data.language,
    durationSeconds: data.duration_seconds,
  };
}
