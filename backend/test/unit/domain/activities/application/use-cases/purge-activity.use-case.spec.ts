import { describe, it, expect, beforeEach, vi } from "vitest";
import { UniqueEntityID } from "@/core/unique-entity-id";
import { Activity } from "@/domain/activities/enterprise/entities/activity";
import { PurgeActivityUseCase, ActivityNotFoundError, ActivityForbiddenError } from "@/domain/activities/application/use-cases/purge-activity.use-case";
import { InMemoryActivitiesRepository } from "../../repositories/in-memory-activities.repository";
import type { S3StoragePort } from "@/domain/integrations/goto/application/ports/s3-storage.port";
import type { GoogleDrivePort } from "@/domain/integrations/whatsapp/application/ports/google-drive.port";
import type { GmailPort } from "@/domain/integrations/email/application/ports/gmail.port";

function makeActivity(overrides: Partial<InstanceType<typeof Activity>["props"]> = {}) {
  return Activity.create(
    {
      ownerId: "user-1",
      type: "task",
      subject: "Test activity",
      completed: false,
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

function makeFakeS3(): S3StoragePort & { deletedKeys: string[]; shouldFail: boolean } {
  return {
    deletedKeys: [],
    shouldFail: false,
    findRecordingKey: vi.fn(),
    findSiblingKey: vi.fn(),
    download: vi.fn(),
    async deleteObject(key: string) {
      if (this.shouldFail) throw new Error("S3 delete failed (simulated)");
      this.deletedKeys.push(key);
    },
  } as any;
}

function makeFakeDrive(): GoogleDrivePort & { deletedFileIds: string[]; shouldFail: boolean } {
  return {
    deletedFileIds: [],
    shouldFail: false,
    uploadFile: vi.fn(),
    getOrCreateFolder: vi.fn(),
    async deleteFile(fileId: string) {
      if (this.shouldFail) throw new Error("Drive delete failed (simulated)");
      this.deletedFileIds.push(fileId);
    },
  } as any;
}

function makeFakeGmail(): GmailPort & { trashedIds: string[]; shouldFail: boolean } {
  return {
    trashedIds: [],
    shouldFail: false,
    send: vi.fn(),
    pollHistory: vi.fn(),
    getProfile: vi.fn(),
    getMessage: vi.fn(),
    getSendAsAliases: vi.fn(),
    sendCalendarInvite: vi.fn(),
    async trashMessage(_userId: string, messageId: string) {
      if (this.shouldFail) throw new Error("Gmail trash failed (simulated)");
      this.trashedIds.push(messageId);
    },
  } as any;
}

describe("PurgeActivityUseCase", () => {
  let repo: InMemoryActivitiesRepository;
  let s3: ReturnType<typeof makeFakeS3>;
  let drive: ReturnType<typeof makeFakeDrive>;
  let gmail: ReturnType<typeof makeFakeGmail>;
  let sut: PurgeActivityUseCase;

  beforeEach(() => {
    repo = new InMemoryActivitiesRepository();
    s3 = makeFakeS3();
    drive = makeFakeDrive();
    gmail = makeFakeGmail();
    sut = new PurgeActivityUseCase(repo, s3, drive, gmail);
  });

  it("returns ActivityNotFoundError when activity does not exist", async () => {
    const result = await sut.execute({ id: "nonexistent", requesterId: "user-1", isAdmin: true });
    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(ActivityNotFoundError);
  });

  it("returns ActivityForbiddenError when caller is not admin", async () => {
    repo.items.push(makeActivity());
    const result = await sut.execute({ id: "activity-1", requesterId: "user-1", isAdmin: false });
    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(ActivityForbiddenError);
  });

  it("deletes activity from DB for generic type", async () => {
    repo.items.push(makeActivity({ type: "task" }));
    const result = await sut.execute({ id: "activity-1", requesterId: "user-1", isAdmin: true });
    expect(result.isRight()).toBe(true);
    expect(repo.items).toHaveLength(0);
  });

  it("deletes both S3 recordings for call type", async () => {
    repo.items.push(makeActivity({ type: "call", gotoRecordingUrl: "2024/01/01/agent.mp3", gotoRecordingUrl2: "2024/01/01/client.mp3" }));
    await sut.execute({ id: "activity-1", requesterId: "user-1", isAdmin: true });
    expect(s3.deletedKeys).toEqual(["2024/01/01/agent.mp3", "2024/01/01/client.mp3"]);
    expect(repo.items).toHaveLength(0);
  });

  it("deletes only agent track when client track is absent", async () => {
    repo.items.push(makeActivity({ type: "call", gotoRecordingUrl: "2024/01/01/agent.mp3" }));
    await sut.execute({ id: "activity-1", requesterId: "user-1", isAdmin: true });
    expect(s3.deletedKeys).toEqual(["2024/01/01/agent.mp3"]);
  });

  it("S3 deletion failure is non-fatal — still deletes from DB", async () => {
    s3.shouldFail = true;
    repo.items.push(makeActivity({ type: "call", gotoRecordingUrl: "2024/01/01/agent.mp3" }));
    const result = await sut.execute({ id: "activity-1", requesterId: "user-1", isAdmin: true });
    expect(result.isRight()).toBe(true);
    expect(repo.items).toHaveLength(0);
  });

  it("call activity with no recordings deletes from DB only", async () => {
    repo.items.push(makeActivity({ type: "call" }));
    const result = await sut.execute({ id: "activity-1", requesterId: "user-1", isAdmin: true });
    expect(result.isRight()).toBe(true);
    expect(s3.deletedKeys).toHaveLength(0);
    expect(repo.items).toHaveLength(0);
  });

  it("deletes WhatsApp Drive media files", async () => {
    repo.items.push(makeActivity({ type: "whatsapp" }));
    repo.whatsAppDriveIds.set("activity-1", ["drive-file-1", "drive-file-2"]);
    await sut.execute({ id: "activity-1", requesterId: "user-1", isAdmin: true });
    expect(drive.deletedFileIds).toEqual(["drive-file-1", "drive-file-2"]);
    expect(repo.items).toHaveLength(0);
  });

  it("Drive deletion failure is non-fatal — still deletes from DB", async () => {
    drive.shouldFail = true;
    repo.items.push(makeActivity({ type: "whatsapp" }));
    repo.whatsAppDriveIds.set("activity-1", ["drive-file-1"]);
    const result = await sut.execute({ id: "activity-1", requesterId: "user-1", isAdmin: true });
    expect(result.isRight()).toBe(true);
    expect(repo.items).toHaveLength(0);
  });

  it("WhatsApp activity with no media deletes from DB only", async () => {
    repo.items.push(makeActivity({ type: "whatsapp" }));
    const result = await sut.execute({ id: "activity-1", requesterId: "user-1", isAdmin: true });
    expect(result.isRight()).toBe(true);
    expect(drive.deletedFileIds).toHaveLength(0);
    expect(repo.items).toHaveLength(0);
  });

  it("trashes Gmail message for email type", async () => {
    repo.items.push(makeActivity({ type: "email", emailMessageId: "gmail-msg-123" }));
    await sut.execute({ id: "activity-1", requesterId: "user-1", isAdmin: true });
    expect(gmail.trashedIds).toEqual(["gmail-msg-123"]);
    expect(repo.items).toHaveLength(0);
  });

  it("Gmail trash failure is non-fatal — still deletes from DB", async () => {
    gmail.shouldFail = true;
    repo.items.push(makeActivity({ type: "email", emailMessageId: "gmail-msg-123" }));
    const result = await sut.execute({ id: "activity-1", requesterId: "user-1", isAdmin: true });
    expect(result.isRight()).toBe(true);
    expect(repo.items).toHaveLength(0);
  });

  it("email activity with no messageId deletes from DB only", async () => {
    repo.items.push(makeActivity({ type: "email" }));
    const result = await sut.execute({ id: "activity-1", requesterId: "user-1", isAdmin: true });
    expect(result.isRight()).toBe(true);
    expect(gmail.trashedIds).toHaveLength(0);
    expect(repo.items).toHaveLength(0);
  });
});
