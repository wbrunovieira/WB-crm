/**
 * GoTo Recording Downloader
 *
 * Downloads call recording audio from the GoTo API.
 * Endpoint: GET /recording/v1/recordings/{recordingId}/content
 * Scope: cr.v1.read (already configured)
 */

import { getValidAccessToken } from "./token-manager";

const GOTO_API = "https://api.goto.com";

export interface DownloadResult {
  buffer: Buffer;
  contentType: string;
}

/**
 * Downloads the audio content of a GoTo call recording.
 * Returns a Buffer and the content-type (audio/mpeg, audio/wav, etc.)
 */
export async function downloadCallRecording(recordingId: string): Promise<DownloadResult> {
  const accessToken = await getValidAccessToken();

  const res = await fetch(
    `${GOTO_API}/recording/v1/recordings/${recordingId}/content`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `GoTo recording download failed ${res.status} for ${recordingId}: ${text}`
    );
  }

  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const contentType = res.headers.get("content-type") ?? "audio/mpeg";

  return { buffer, contentType };
}
