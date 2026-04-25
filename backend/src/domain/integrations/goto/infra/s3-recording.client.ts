import { Injectable, Logger } from "@nestjs/common";
import { S3StoragePort } from "@/domain/integrations/goto/application/ports/s3-storage.port";

function getS3Client() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { S3Client } = require("@aws-sdk/client-s3") as typeof import("@aws-sdk/client-s3");
  return new S3Client({
    region: process.env.AWS_REGION ?? "us-east-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
}

function getBucket(): string {
  return process.env.AWS_S3_GOTO_BUCKET ?? "wb-crm-goto-recordings";
}

function extractCallIdFromKey(s3Key: string): string | null {
  const filename = s3Key.split("/").pop() ?? "";
  const parts = filename.split("~");
  return parts.length >= 2 ? parts[1] : null;
}

function extractTimestampFromKey(s3Key: string): number | null {
  const filename = s3Key.split("/").pop() ?? "";
  const iso = filename.split("~")[0];
  const ms = Date.parse(iso);
  return isNaN(ms) ? null : ms;
}

@Injectable()
export class S3RecordingClient extends S3StoragePort {
  private readonly logger = new Logger(S3RecordingClient.name);

  async findRecordingKey(recordingId: string, callDate: Date): Promise<string | null> {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ListObjectsV2Command } = require("@aws-sdk/client-s3") as typeof import("@aws-sdk/client-s3");
    const client = getS3Client();
    const bucket = getBucket();

    // Try call date and previous day (timezone safety)
    const datesToTry = [callDate, new Date(callDate.getTime() - 86400000)];

    for (const date of datesToTry) {
      const yyyy = date.getUTCFullYear();
      const MM = String(date.getUTCMonth() + 1).padStart(2, "0");
      const dd = String(date.getUTCDate()).padStart(2, "0");
      const prefix = `${yyyy}/${MM}/${dd}/`;

      const res = await client.send(
        new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix }),
      );

      const match = res.Contents?.find((obj) => obj.Key?.includes(`~${recordingId}.mp3`));
      if (match?.Key) return match.Key;
    }

    return null;
  }

  async findSiblingKey(agentKey: string): Promise<{ key: string; offsetMs: number } | null> {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ListObjectsV2Command } = require("@aws-sdk/client-s3") as typeof import("@aws-sdk/client-s3");
    const callId = extractCallIdFromKey(agentKey);
    if (!callId) return null;

    const prefix = agentKey.substring(0, agentKey.lastIndexOf("/") + 1);
    const agentTs = extractTimestampFromKey(agentKey) ?? 0;

    const client = getS3Client();
    const res = await client.send(
      new ListObjectsV2Command({ Bucket: getBucket(), Prefix: prefix }),
    );

    const sibling = res.Contents?.find(
      (obj) => obj.Key && obj.Key !== agentKey && obj.Key.includes(`~${callId}~`),
    );

    if (!sibling?.Key) return null;

    const siblingTs = extractTimestampFromKey(sibling.Key) ?? agentTs;
    const offsetMs = siblingTs - agentTs;

    return { key: sibling.Key, offsetMs };
  }

  async deleteObject(key: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { DeleteObjectCommand } = require("@aws-sdk/client-s3") as typeof import("@aws-sdk/client-s3");
    const client = getS3Client();
    await client.send(new DeleteObjectCommand({ Bucket: getBucket(), Key: key }));
    this.logger.log(`Deleted S3 object: ${key}`);
  }

  async download(key: string): Promise<Buffer> {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { GetObjectCommand } = require("@aws-sdk/client-s3") as typeof import("@aws-sdk/client-s3");
    const client = getS3Client();

    const res = await client.send(
      new GetObjectCommand({ Bucket: getBucket(), Key: key }),
    );

    if (!res.Body) throw new Error(`S3 object body empty for key: ${key}`);

    const chunks: Uint8Array[] = [];
    for await (const chunk of res.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }

    return Buffer.concat(chunks);
  }
}
