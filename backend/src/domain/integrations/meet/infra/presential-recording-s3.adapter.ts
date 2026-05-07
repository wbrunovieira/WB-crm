import { Injectable } from "@nestjs/common";
import { PresentialRecordingStoragePort } from "../application/ports/presential-recording-storage.port";

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
  return process.env.AWS_S3_PRESENTIAL_BUCKET ?? process.env.AWS_S3_GOTO_BUCKET ?? "wb-crm-recordings";
}

@Injectable()
export class PresentialRecordingS3Adapter extends PresentialRecordingStoragePort {
  buildKey(meetingId: string, filename: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    return `presential/${meetingId}/${timestamp}-${filename}`;
  }

  async upload(key: string, buffer: Buffer, contentType: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PutObjectCommand } = require("@aws-sdk/client-s3") as typeof import("@aws-sdk/client-s3");
    const client = getS3Client();
    await client.send(
      new PutObjectCommand({
        Bucket: getBucket(),
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    );
  }

  async getSignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { GetObjectCommand } = require("@aws-sdk/client-s3") as typeof import("@aws-sdk/client-s3");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getSignedUrl } = require("@aws-sdk/s3-request-presigner") as typeof import("@aws-sdk/s3-request-presigner");
    const client = getS3Client();
    return getSignedUrl(client, new GetObjectCommand({ Bucket: getBucket(), Key: key }), {
      expiresIn: expiresInSeconds,
    });
  }
}
