export abstract class S3StoragePort {
  abstract findRecordingKey(recordingId: string, callDate: Date): Promise<string | null>;
  abstract findRecordingKeyByConversationId(
    conversationSpaceId: string,
    callDate: Date,
  ): Promise<{ key: string; recordingId: string } | null>;
  abstract findSiblingKey(agentKey: string): Promise<{ key: string; offsetMs: number } | null>;
  abstract download(key: string): Promise<Buffer>;
  abstract deleteObject(key: string): Promise<void>;
}
