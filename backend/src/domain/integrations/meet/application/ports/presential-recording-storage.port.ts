export abstract class PresentialRecordingStoragePort {
  abstract upload(key: string, buffer: Buffer, contentType: string): Promise<void>;
  abstract buildKey(meetingId: string, filename: string): string;
  abstract getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;
}
