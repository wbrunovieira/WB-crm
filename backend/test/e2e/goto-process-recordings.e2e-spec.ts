import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "@/app.module";
import { GoToApiPort } from "@/domain/integrations/goto/application/ports/goto-api.port";
import { GoToTokenPort } from "@/domain/integrations/goto/application/ports/goto-token.port";
import { S3StoragePort } from "@/domain/integrations/goto/application/ports/s3-storage.port";
import { ActivitiesRepository } from "@/domain/activities/application/repositories/activities.repository";

const WEBHOOK_SECRET = "test-secret-process";

const fakeGoToApi = {
  fetchCallReport: async () => null,
  fetchReportsSince: async () => [],
  refreshToken: async () => ({ accessToken: "tok", refreshToken: "ref", expiresAt: Date.now() + 3600000 }),
};
const fakeGoToToken = { getValidAccessToken: async () => "test-token" };
const fakeS3 = { findRecordingKey: async () => null, findSiblingKey: async () => null, download: async () => Buffer.from("") };
const fakeActivities = { findByIdRaw: async () => null, findByIdForTranscription: async () => null, findFirst: async () => null, save: async () => {}, findMany: async () => [], findById: async () => null, delete: async () => {}, markThreadReplied: async () => {} };

describe("GoTo Process Recordings trigger (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.GOTO_WEBHOOK_SECRET = WEBHOOK_SECRET;
    process.env.GOTO_DEFAULT_OWNER_ID = "owner-e2e";

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(GoToApiPort).useValue(fakeGoToApi)
      .overrideProvider(GoToTokenPort).useValue(fakeGoToToken)
      .overrideProvider(S3StoragePort).useValue(fakeS3)
      .overrideProvider(ActivitiesRepository).useValue(fakeActivities)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => { await app?.close(); });

  it("POST /webhooks/goto/process-recordings without secret → 401", async () => {
    const res = await request(app.getHttpServer())
      .post("/webhooks/goto/process-recordings");
    expect(res.status).toBe(401);
  });

  it("POST /webhooks/goto/process-recordings with wrong secret → 401", async () => {
    const res = await request(app.getHttpServer())
      .post("/webhooks/goto/process-recordings?secret=wrong");
    expect(res.status).toBe(401);
  });

  it("POST /webhooks/goto/process-recordings with correct secret → 200 { ok: true }", async () => {
    const res = await request(app.getHttpServer())
      .post(`/webhooks/goto/process-recordings?secret=${WEBHOOK_SECRET}`);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
