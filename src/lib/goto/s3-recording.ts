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
