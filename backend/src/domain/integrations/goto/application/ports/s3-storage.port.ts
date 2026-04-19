export abstract class S3StoragePort {
  abstract findRecordingKey(recordingId: string, callDate: Date): Promise<string | null>;
  abstract findSiblingKey(agentKey: string): Promise<{ key: string; offsetMs: number } | null>;
  abstract download(key: string): Promise<Buffer>;
}
