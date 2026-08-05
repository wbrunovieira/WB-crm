import { describe, it, expect, beforeEach } from "vitest";
import { UploadActivityPhotoUseCase } from "@/domain/activities/application/use-cases/upload-activity-photo.use-case";
import { ActivityPhotoStoragePort } from "@/domain/activities/application/ports/activity-photo-storage.port";
import { InMemoryActivitiesRepository } from "../../repositories/in-memory-activities.repository";
import { Activity } from "@/domain/activities/enterprise/entities/activity";
import { UniqueEntityID } from "@/core/unique-entity-id";

class FakeStorage extends ActivityPhotoStoragePort {
  public uploads: Array<{ key: string; contentType: string }> = [];
  public signedUrls: Map<string, string> = new Map();
  public shouldFail = false;

  buildKey(activityId: string, filename: string): string {
    return `activity-photo/${activityId}/${filename}`;
  }

  async upload(key: string, _buffer: Buffer, contentType: string): Promise<void> {
    if (this.shouldFail) throw new Error("S3 unavailable");
    this.uploads.push({ key, contentType });
  }

  async download(_key: string): Promise<Buffer> {
    return Buffer.from("fake-photo");
  }

  async getSignedUrl(key: string): Promise<string> {
    return this.signedUrls.get(key) ?? `https://s3.example.com/${key}`;
  }
}

function makeActivity(overrides: Partial<InstanceType<typeof Activity>["props"]> = {}) {
  return Activity.create(
    {
      ownerId: "owner-1",
      type: "physical_visit",
      subject: "Visita porta a porta — Padaria do João",
      completed: true,
      meetingNoShow: false,
      emailReplied: false,
      emailOpenCount: 0,
      emailLinkClickCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    } as any,
    new UniqueEntityID("activity-1"),
  );
}

describe("UploadActivityPhotoUseCase", () => {
  let repo: InMemoryActivitiesRepository;
  let storage: FakeStorage;
  let sut: UploadActivityPhotoUseCase;

  beforeEach(() => {
    repo = new InMemoryActivitiesRepository();
    storage = new FakeStorage();
    sut = new UploadActivityPhotoUseCase(repo, storage);
  });

  it("faz upload da foto para S3 e retorna a signed URL", async () => {
    await repo.save(makeActivity());
    const buffer = Buffer.from("photo-data");

    const result = await sut.execute({
      activityId: "activity-1",
      buffer,
      filename: "fachada.jpg",
      contentType: "image/jpeg",
      requesterId: "owner-1",
      requesterRole: "sdr",
    });

    expect(result.isRight()).toBe(true);
    expect(storage.uploads).toHaveLength(1);
    expect(storage.uploads[0].key).toContain("activity-1");
    expect(storage.uploads[0].contentType).toBe("image/jpeg");
    if (result.isRight()) {
      expect(result.value.photoUrl).toContain("s3.example.com");
    }
  });

  it("salva photoKey na atividade", async () => {
    await repo.save(makeActivity());

    await sut.execute({
      activityId: "activity-1",
      buffer: Buffer.from("x"),
      filename: "fachada.jpg",
      contentType: "image/jpeg",
      requesterId: "owner-1",
      requesterRole: "sdr",
    });

    const activity = await repo.findByIdRaw("activity-1");
    expect(activity?.photoKey).toContain("activity-1");
  });

  it("retorna erro quando a atividade não é encontrada", async () => {
    const result = await sut.execute({
      activityId: "nao-existe",
      buffer: Buffer.from("x"),
      filename: "fachada.jpg",
      contentType: "image/jpeg",
      requesterId: "owner-1",
      requesterRole: "sdr",
    });

    expect(result.isLeft()).toBe(true);
    expect((result.value as Error).message).toContain("não encontrada");
  });

  it("retorna erro quando o requester não é o dono da atividade", async () => {
    await repo.save(makeActivity());

    const result = await sut.execute({
      activityId: "activity-1",
      buffer: Buffer.from("x"),
      filename: "fachada.jpg",
      contentType: "image/jpeg",
      requesterId: "outro-user",
      requesterRole: "sdr",
    });

    expect(result.isLeft()).toBe(true);
    expect(storage.uploads).toHaveLength(0);
  });

  it("retorna erro quando o S3 falha, sem salvar photoKey", async () => {
    await repo.save(makeActivity());
    storage.shouldFail = true;

    const result = await sut.execute({
      activityId: "activity-1",
      buffer: Buffer.from("x"),
      filename: "fachada.jpg",
      contentType: "image/jpeg",
      requesterId: "owner-1",
      requesterRole: "sdr",
    });

    expect(result.isLeft()).toBe(true);
    const activity = await repo.findByIdRaw("activity-1");
    expect(activity?.photoKey).toBeUndefined();
  });
});
