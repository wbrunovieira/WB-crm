export abstract class ActivityPhotoStoragePort {
  abstract upload(key: string, buffer: Buffer, contentType: string): Promise<void>;
  abstract download(key: string): Promise<Buffer>;
  abstract buildKey(activityId: string, filename: string): string;
  abstract getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;
}
