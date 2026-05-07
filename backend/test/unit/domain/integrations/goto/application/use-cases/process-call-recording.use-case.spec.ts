import { describe, it, expect, beforeEach } from "vitest";
import { ProcessCallRecordingUseCase } from "@/domain/integrations/goto/application/use-cases/process-call-recording.use-case";
import { FakeActivitiesRepository } from "../../fakes/fake-activities.repository";
import { FakeS3StoragePort } from "../../fakes/fake-s3-storage.port";
import { FakeTranscriberPort } from "../../fakes/fake-transcriber.port";
import { UniqueEntityID } from "@/core/unique-entity-id";
import { Activity } from "@/domain/activities/enterprise/entities/activity";

function makeActivity(overrides: Partial<Parameters<typeof Activity.create>[0]> = {}): Activity {
  return Activity.create(
    {
      ownerId: "owner-001",
      type: "call",
      subject: "Test call",
      completed: true,
      completedAt: new Date(),
      gotoCallId: "call-123",
      gotoRecordingId: "rec-001",
      meetingNoShow: false,
      emailReplied: false,
      emailOpenCount: 0,
      emailLinkClickCount: 0,
      ...overrides,
    },
    new UniqueEntityID("activity-001"),
  );
}

let repo: FakeActivitiesRepository;
let s3: FakeS3StoragePort;
let transcriber: FakeTranscriberPort;
let useCase: ProcessCallRecordingUseCase;

beforeEach(() => {
  repo = new FakeActivitiesRepository();
  s3 = new FakeS3StoragePort();
  transcriber = new FakeTranscriberPort();
  useCase = new ProcessCallRecordingUseCase(repo, s3, transcriber);
});

describe("ProcessCallRecordingUseCase", () => {
  it("skips activity already processed (has gotoRecordingUrl)", async () => {
    const activity = makeActivity({ gotoRecordingUrl: "2024/01/01/key.mp3" });
    repo.items.push(activity);

    const result = await useCase.execute({ activityId: "activity-001" });

    expect(result.isRight()).toBe(true);
    expect(result.value).toMatchObject({ skipped: true });
    expect(transcriber.submittedJobs).toHaveLength(0);
  });

  it("skips activity with no gotoRecordingId AND no gotoCallId", async () => {
    const activity = makeActivity({ gotoRecordingId: undefined, gotoCallId: undefined });
    repo.items.push(activity);

    const result = await useCase.execute({ activityId: "activity-001" });

    expect(result.isRight()).toBe(true);
    expect(result.value).toMatchObject({ skipped: true });
  });

  it("returns notFound when activity doesn't exist", async () => {
    const result = await useCase.execute({ activityId: "non-existent" });

    expect(result.isRight()).toBe(true);
    expect(result.value).toMatchObject({ notFound: true });
  });

  it("returns notFound when S3 key not found (has gotoRecordingId)", async () => {
    const activity = makeActivity();
    repo.items.push(activity);
    // Don't add to S3 — key not found

    const result = await useCase.execute({ activityId: "activity-001" });

    expect(result.isRight()).toBe(true);
    expect(result.value).toMatchObject({ notFound: true });
  });

  it("submits both tracks when sibling found", async () => {
    const activity = makeActivity();
    repo.items.push(activity);

    const agentKey = "2024/01/01/ts~call-id~phone1~phone2~rec-001.mp3";
    const clientKey = "2024/01/01/ts~call-id~phone1~phone2~rec-002.mp3";
    s3.addRecordingKey("rec-001", agentKey);
    s3.addSibling(agentKey, clientKey, 500);

    transcriber.setNextJobId("job-agent-001");

    const result = await useCase.execute({ activityId: "activity-001" });

    expect(result.isRight()).toBe(true);
    expect(result.value).toMatchObject({ submitted: true });
    expect(transcriber.submittedJobs).toHaveLength(2);
  });

  it("submits only agent when no sibling", async () => {
    const activity = makeActivity();
    repo.items.push(activity);

    const agentKey = "2024/01/01/ts~call-id~phone1~phone2~rec-001.mp3";
    s3.addRecordingKey("rec-001", agentKey);
    // No sibling added

    transcriber.setNextJobId("job-agent-001");

    const result = await useCase.execute({ activityId: "activity-001" });

    expect(result.isRight()).toBe(true);
    expect(result.value).toMatchObject({ submitted: true });
    expect(transcriber.submittedJobs).toHaveLength(1);
    expect(transcriber.submittedJobs[0].fileName).toContain("agent");
  });

  it("passes callback URL to transcriber when TRANSCRIPTION_CALLBACK_URL is set", async () => {
    process.env.TRANSCRIPTION_CALLBACK_URL = "https://crm.example.com/webhooks/transcription";
    process.env.TRANSCRIPTION_CALLBACK_SECRET = "secret-123";

    const activity = makeActivity();
    repo.items.push(activity);
    const agentKey = "2024/01/01/ts~call-id~phone1~phone2~rec-001.mp3";
    s3.addRecordingKey("rec-001", agentKey);

    await useCase.execute({ activityId: "activity-001" });

    expect(transcriber.submittedJobs[0].callbackUrl).toBe(
      "https://crm.example.com/webhooks/transcription",
    );

    delete process.env.TRANSCRIPTION_CALLBACK_URL;
    delete process.env.TRANSCRIPTION_CALLBACK_SECRET;
  });

  it("submits without callback URL when env var is not set", async () => {
    delete process.env.TRANSCRIPTION_CALLBACK_URL;

    const activity = makeActivity();
    repo.items.push(activity);
    const agentKey = "2024/01/01/ts~call-id~phone1~phone2~rec-001.mp3";
    s3.addRecordingKey("rec-001", agentKey);

    await useCase.execute({ activityId: "activity-001" });

    expect(transcriber.submittedJobs[0].callbackUrl).toBeUndefined();
  });

  it("saves S3 keys and job IDs on activity", async () => {
    const activity = makeActivity();
    repo.items.push(activity);

    const agentKey = "2024/01/01/ts~call-id~phone1~phone2~rec-001.mp3";
    const clientKey = "2024/01/01/ts~call-id~phone1~phone2~rec-002.mp3";
    s3.addRecordingKey("rec-001", agentKey);
    s3.addSibling(agentKey, clientKey, 0);

    transcriber.setNextJobId("job-001");

    await useCase.execute({ activityId: "activity-001" });

    const saved = repo.items[0];
    expect(saved.gotoRecordingUrl).toBe(agentKey);
    expect(saved.gotoRecordingUrl2).toBe(clientKey);
    expect(saved.gotoTranscriptionJobId).toBe("job-001");
    expect(saved.gotoTranscriptionJobId2).toBe("job-001"); // same fake job id
  });

  describe("fallback: find by conversationSpaceId when gotoRecordingId is null", () => {
    it("finds recording via gotoCallId when gotoRecordingId is not set", async () => {
      const activity = makeActivity({ gotoRecordingId: undefined, gotoCallId: "conv-abc" });
      repo.items.push(activity);

      const agentKey = "2026/05/07/ts~conv-abc~551150264203~unknown~rec-xyz.mp3";
      s3.addRecordingKeyByConversationId("conv-abc", agentKey, "rec-xyz");

      transcriber.setNextJobId("job-001");

      const result = await useCase.execute({ activityId: "activity-001" });

      expect(result.isRight()).toBe(true);
      expect(result.value).toMatchObject({ submitted: true });
      expect(transcriber.submittedJobs).toHaveLength(1);
    });

    it("saves the discovered recordingId back on the activity", async () => {
      const activity = makeActivity({ gotoRecordingId: undefined, gotoCallId: "conv-abc" });
      repo.items.push(activity);

      const agentKey = "2026/05/07/ts~conv-abc~551150264203~unknown~rec-xyz.mp3";
      s3.addRecordingKeyByConversationId("conv-abc", agentKey, "rec-xyz");
      transcriber.setNextJobId("job-001");

      await useCase.execute({ activityId: "activity-001" });

      const saved = repo.items[0];
      expect(saved.gotoRecordingId).toBe("rec-xyz");
      expect(saved.gotoRecordingUrl).toBe(agentKey);
    });

    it("returns notFound when neither gotoRecordingId nor S3 match by conversationSpaceId", async () => {
      const activity = makeActivity({ gotoRecordingId: undefined, gotoCallId: "conv-missing" });
      repo.items.push(activity);
      // S3 has no file for conv-missing

      const result = await useCase.execute({ activityId: "activity-001" });

      expect(result.isRight()).toBe(true);
      expect(result.value).toMatchObject({ notFound: true });
    });

    it("also submits sibling track when found via conversationSpaceId fallback", async () => {
      const activity = makeActivity({ gotoRecordingId: undefined, gotoCallId: "conv-abc" });
      repo.items.push(activity);

      const agentKey = "2026/05/07/ts~conv-abc~551150264203~unknown~rec-xyz.mp3";
      const clientKey = "2026/05/07/ts~conv-abc~552422371695~unknown~rec-client.mp3";
      s3.addRecordingKeyByConversationId("conv-abc", agentKey, "rec-xyz");
      s3.addSibling(agentKey, clientKey, 0);
      transcriber.setNextJobId("job-001");

      const result = await useCase.execute({ activityId: "activity-001" });

      expect(result.value).toMatchObject({ submitted: true });
      expect(transcriber.submittedJobs).toHaveLength(2);
    });
  });
});
