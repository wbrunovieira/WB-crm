import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "@/app.module";
import { GoToApiPort } from "@/domain/integrations/goto/application/ports/goto-api.port";
import { GoToTokenPort } from "@/domain/integrations/goto/application/ports/goto-token.port";
import { S3StoragePort } from "@/domain/integrations/goto/application/ports/s3-storage.port";
import { TranscriberPort } from "@/infra/shared/transcriber/transcriber.port";
import { ActivitiesRepository } from "@/domain/activities/application/repositories/activities.repository";

const fakeGoToApi = {
  fetchCallReport: async () => null,
  fetchReportsSince: async () => [],
  refreshToken: async () => ({ accessToken: "tok", refreshToken: "ref", expiresAt: Date.now() + 3600000 }),
};
const fakeGoToToken = { getValidAccessToken: async () => "test-token" };
const fakeS3 = { upload: async () => "key", download: async () => Buffer.from("") };
// Never hit the network — these paths are never reached in the tests below.
const fakeTranscriber = {
  submitAudio: async () => ({ jobId: "job" }),
  getStatus: async () => ({ jobId: "job", status: "processing" as const }),
  getResult: async () => ({ jobId: "job", text: "", language: "pt", durationSeconds: 0, segments: [] }),
};

// Mutable stub so each test can control what the repository returns.
let stubActivity: Record<string, unknown> | null = null;
const fakeActivities = {
  findByIdRaw: async () => stubActivity,
  // Poll uses this; returning null makes it skip without touching the transcriber.
  findByIdForTranscription: async () => null,
  save: async () => {},
};

async function signToken(payload: Record<string, unknown>): Promise<string> {
  const { SignJWT } = await import("jose");
  const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? "test-secret");
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("1h")
    .sign(secret);
}

/**
 * Covers POST /goto/recordings/:activityId/transcribe — the "transcrever agora"
 * button endpoint: auth, not-found, owner-or-admin authorization, and the
 * pending-jobs happy path.
 */
describe("GoTo Transcribe Now (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.GOTO_WEBHOOK_SECRET = "test-secret";
    process.env.GOTO_DEFAULT_OWNER_ID = "e2e-owner";

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(GoToApiPort).useValue(fakeGoToApi)
      .overrideProvider(GoToTokenPort).useValue(fakeGoToToken)
      .overrideProvider(S3StoragePort).useValue(fakeS3)
      .overrideProvider(TranscriberPort).useValue(fakeTranscriber)
      .overrideProvider(ActivitiesRepository).useValue(fakeActivities)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(() => {
    stubActivity = null;
  });

  it("POST without token → 401 (guard resolves, not a DI crash)", async () => {
    const res = await request(app.getHttpServer())
      .post("/goto/recordings/some-activity-id/transcribe");
    expect(res.status).toBe(401);
  });

  it("POST with invalid token → 401", async () => {
    const res = await request(app.getHttpServer())
      .post("/goto/recordings/some-activity-id/transcribe")
      .set("Authorization", "Bearer invalid-token");
    expect(res.status).toBe(401);
  });

  it("valid token but non-existent activity → 404", async () => {
    stubActivity = null;
    const token = await signToken({ sub: "user-1", role: "admin", email: "a@b.com" });

    const res = await request(app.getHttpServer())
      .post("/goto/recordings/non-existent-id/transcribe")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it("non-admin requesting someone else's call → 403", async () => {
    stubActivity = { ownerId: "another-owner", gotoRecordingId: "rec-1", gotoRecordingUrl: "key" };
    const token = await signToken({ sub: "user-1", role: "sdr", email: "a@b.com" });

    const res = await request(app.getHttpServer())
      .post("/goto/recordings/activity-1/transcribe")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  it("owner with a recording and no transcript → 200, pending (jobs running)", async () => {
    // gotoRecordingUrl already set → Pass 1 skips cleanly (no S3/network);
    // findByIdForTranscription returns null → Pass 2 skips → not saved → pending.
    stubActivity = {
      ownerId: "user-1",
      gotoRecordingId: "rec-1",
      gotoRecordingUrl: "key",
      gotoTranscriptText: null,
    };
    const token = await signToken({ sub: "user-1", role: "sdr", email: "a@b.com" });

    const res = await request(app.getHttpServer())
      .post("/goto/recordings/activity-1/transcribe")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ ok: true, alreadyDone: false, saved: false, pending: true });
  });

  it("already-transcribed call → 200, alreadyDone", async () => {
    stubActivity = {
      ownerId: "user-1",
      gotoRecordingId: "rec-1",
      gotoRecordingUrl: "key",
      gotoTranscriptText: "[]",
    };
    const token = await signToken({ sub: "user-1", role: "sdr", email: "a@b.com" });

    const res = await request(app.getHttpServer())
      .post("/goto/recordings/activity-1/transcribe")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ ok: true, alreadyDone: true });
  });
});
