import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "@/app.module";
import { GoToApiPort } from "@/domain/integrations/goto/application/ports/goto-api.port";
import { GoToTokenPort } from "@/domain/integrations/goto/application/ports/goto-token.port";
import { S3StoragePort } from "@/domain/integrations/goto/application/ports/s3-storage.port";
import { ActivitiesRepository } from "@/domain/activities/application/repositories/activities.repository";

const fakeGoToApi = {
  fetchCallReport: async () => null,
  fetchReportsSince: async () => [],
  refreshToken: async () => ({ accessToken: "tok", refreshToken: "ref", expiresAt: Date.now() + 3600000 }),
};

const fakeGoToToken = { getValidAccessToken: async () => "test-token" };

const fakeS3 = { upload: async () => "key", download: async () => Buffer.from("") };

const fakeActivities = { findByIdRaw: async () => null };

/**
 * These tests verify that:
 * 1. The GoToModule bootstraps without DI errors (SseJwtAuthGuard resolves JwtService)
 * 2. The recordings endpoint returns 401 without a token — NOT a 500 DI crash
 */
describe("GoTo Recordings (e2e)", () => {
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
      .overrideProvider(ActivitiesRepository).useValue(fakeActivities)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it("GET /goto/recordings/:id without token → 401 (guard resolves, not DI crash)", async () => {
    const res = await request(app.getHttpServer())
      .get("/goto/recordings/some-activity-id");

    // Must be 401 Unauthorized — if it were 500 that would indicate a DI crash
    expect(res.status).toBe(401);
  });

  it("GET /goto/recordings/:id with invalid token → 401", async () => {
    const res = await request(app.getHttpServer())
      .get("/goto/recordings/some-activity-id")
      .set("Authorization", "Bearer invalid-token");

    expect(res.status).toBe(401);
  });

  it("GET /goto/recordings/:id with valid token but non-existent activity → 404", async () => {
    const { SignJWT } = await import("jose");
    const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? "test-secret");
    const token = await new SignJWT({ sub: "user-1", role: "admin", email: "a@b.com" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("1h")
      .sign(secret);

    const res = await request(app.getHttpServer())
      .get("/goto/recordings/non-existent-id")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});
