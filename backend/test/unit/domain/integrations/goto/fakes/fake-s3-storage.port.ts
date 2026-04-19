import { S3StoragePort } from "@/domain/integrations/goto/application/ports/s3-storage.port";

export class FakeS3StoragePort extends S3StoragePort {
  public keys: Map<string, string> = new Map(); // recordingId → s3Key
  public siblings: Map<string, { key: string; offsetMs: number }> = new Map(); // agentKey → sibling
  public buffers: Map<string, Buffer> = new Map(); // s3Key → buffer

  addRecordingKey(recordingId: string, key: string, buffer?: Buffer): void {
    this.keys.set(recordingId, key);
    this.buffers.set(key, buffer ?? Buffer.from(`fake-audio-${recordingId}`));
  }

  addSibling(agentKey: string, siblingKey: string, offsetMs = 0): void {
    this.siblings.set(agentKey, { key: siblingKey, offsetMs });
    this.buffers.set(siblingKey, Buffer.from(`fake-sibling-audio`));
  }

  async findRecordingKey(recordingId: string, _callDate: Date): Promise<string | null> {
    return this.keys.get(recordingId) ?? null;
  }

  async findSiblingKey(agentKey: string): Promise<{ key: string; offsetMs: number } | null> {
    return this.siblings.get(agentKey) ?? null;
  }

  async download(key: string): Promise<Buffer> {
    const buf = this.buffers.get(key);
    if (!buf) throw new Error(`S3 key not found: ${key}`);
    return buf;
  }
}
