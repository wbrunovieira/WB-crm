/**
 * GoTo S3 Recording
 *
 * Finds and downloads call recordings from the S3 bucket
 * that GoTo uploads to automatically.
 *
 * S3 key format:
 * {yyyy}/{MM}/{dd}/{timestamp}~{callId}~{phone}~{phone}~{recordingId}.mp3
 */

import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
} from "@aws-sdk/client-s3";

function getClient(): S3Client {
  return new S3Client({
    region: process.env.AWS_REGION ?? "us-east-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
}

const BUCKET = () => process.env.AWS_S3_GOTO_BUCKET ?? "wb-crm-goto-recordings";

/**
 * Finds the S3 key for a recording by searching for the recordingId
 * within the date-based prefix. Tries today and yesterday to handle
 * timezone differences.
 */
export async function findRecordingKey(
  recordingId: string,
  callDate: Date
): Promise<string | null> {
  const client = getClient();
  const bucket = BUCKET();

  // Try the call date and the day before (timezone safety)
  const datesToTry = [callDate, new Date(callDate.getTime() - 86400000)];

  for (const date of datesToTry) {
    const yyyy = date.getUTCFullYear();
    const MM = String(date.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(date.getUTCDate()).padStart(2, "0");
    const prefix = `${yyyy}/${MM}/${dd}/`;

    const res = await client.send(
      new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix })
    );

    const match = res.Contents?.find((obj) =>
      obj.Key?.includes(`~${recordingId}.mp3`)
    );

    if (match?.Key) return match.Key;
  }

  return null;
}

/**
 * Extracts the callId from a GoTo S3 key.
 * Format: {yyyy}/{MM}/{dd}/{timestamp}~{callId}~{phone}~{phone}~{recordingId}.mp3
 */
export function extractCallIdFromKey(s3Key: string): string | null {
  const filename = s3Key.split("/").pop() ?? "";
  const parts = filename.split("~");
  return parts.length >= 2 ? parts[1] : null;
}

/**
 * Extracts the recording timestamp (ms) from a GoTo S3 key.
 * The timestamp is the ISO8601 string before the first ~.
 * Returns null if the timestamp can't be parsed.
 */
export function extractTimestampFromKey(s3Key: string): number | null {
  const filename = s3Key.split("/").pop() ?? "";
  const iso = filename.split("~")[0];
  const ms = Date.parse(iso);
  return isNaN(ms) ? null : ms;
}

/**
 * Given the agent S3 key, finds the sibling recording key
 * (same callId, different recordingId) — the client track.
 * Returns { key, offsetMs } where offsetMs = client start − agent start.
 */
export async function findSiblingRecordingKey(
  agentKey: string
): Promise<{ key: string; offsetMs: number } | null> {
  const callId = extractCallIdFromKey(agentKey);
  if (!callId) return null;

  const prefix = agentKey.substring(0, agentKey.lastIndexOf("/") + 1);
  const agentTs = extractTimestampFromKey(agentKey) ?? 0;

  const client = getClient();
  const res = await client.send(
    new ListObjectsV2Command({ Bucket: BUCKET(), Prefix: prefix })
  );

  const sibling = res.Contents?.find(
    (obj) => obj.Key && obj.Key !== agentKey && obj.Key.includes(`~${callId}~`)
  );

  if (!sibling?.Key) return null;

  const siblingTs = extractTimestampFromKey(sibling.Key) ?? agentTs;
  const offsetMs = siblingTs - agentTs;

  return { key: sibling.Key, offsetMs };
}

/**
 * Downloads a recording from S3 by its key.
 * Returns a Buffer with the MP3 content.
 */
export async function downloadRecordingFromS3(
  s3Key: string
): Promise<{ buffer: Buffer; contentType: string }> {
  const client = getClient();

  const res = await client.send(
    new GetObjectCommand({ Bucket: BUCKET(), Key: s3Key })
  );

  if (!res.Body) throw new Error(`S3 object body empty for key: ${s3Key}`);

  const chunks: Uint8Array[] = [];
  for await (const chunk of res.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  const buffer = Buffer.concat(chunks);
  const contentType = res.ContentType ?? "audio/mpeg";

  return { buffer, contentType };
}

/**
 * Streams a recording from S3 directly (for the audio proxy route).
 * Returns the raw S3 response body stream + metadata.
 */
export async function streamRecordingFromS3(s3Key: string) {
  const client = getClient();

  const res = await client.send(
    new GetObjectCommand({ Bucket: BUCKET(), Key: s3Key })
  );

  return {
    body: res.Body,
    contentType: res.ContentType ?? "audio/mpeg",
    contentLength: res.ContentLength,
  };
}
