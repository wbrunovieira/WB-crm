import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "@/app.module";
import { GoToApiPort, GoToCallReport } from "@/domain/integrations/goto/application/ports/goto-api.port";
import { GoToTokenPort } from "@/domain/integrations/goto/application/ports/goto-token.port";

const WEBHOOK_SECRET = "test-webhook-secret-e2e";

const cannedReport: GoToCallReport = {
  conversationSpaceId: "e2e-call-space-001",
  accountKey: "acc-e2e",
  direction: "OUTBOUND",
  callCreated: new Date(Date.now() - 60000).toISOString(),
  callEnded: new Date().toISOString(),
  participants: [
    {
      id: "part-line",
      legId: "leg-line",
      type: { value: "LINE", lineId: "line-1" },
    },
    {
      id: "part-phone",
      legId: "leg-phone",
      type: { value: "PHONE_NUMBER", callee: { name: "Test", number: "+5511999998888" } },
      causeCode: 16,
    },
  ],
};

const fakeGoToApi = {
  fetchCallReport: async (_id: string, _token: string) => cannedReport,
  fetchReportsSince: async () => [],
  refreshToken: async () => ({
    accessToken: "new-token",
    refreshToken: "new-refresh",
    expiresAt: Date.now() + 3600000,
  }),
};

const fakeGoToToken = {
  getValidAccessToken: async () => "test-token-e2e",
};

describe("GoTo Webhook (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.GOTO_WEBHOOK_SECRET = WEBHOOK_SECRET;
    process.env.GOTO_DEFAULT_OWNER_ID = "e2e-owner-id";

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(GoToApiPort)
      .useValue(fakeGoToApi)
      .overrideProvider(GoToTokenPort)
      .useValue(fakeGoToToken)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("POST /webhooks/goto/calls without secret → 401", () => {
    return request(app.getHttpServer())
      .post("/webhooks/goto/calls")
      .send({ eventType: "STARTING" })
      .expect(401);
  });

  it("POST /webhooks/goto/calls?secret=wrong → 401", () => {
    return request(app.getHttpServer())
      .post("/webhooks/goto/calls?secret=wrong-secret")
      .send({ eventType: "STARTING" })
      .expect(401);
  });

  it("POST /webhooks/goto/calls?secret={correct} with empty body + GoTo user-agent → 200 { ok: true } (ping)", () => {
    return request(app.getHttpServer())
      .post(`/webhooks/goto/calls?secret=${WEBHOOK_SECRET}`)
      .set("User-Agent", "GoTo Notifications/1.0")
      .send({})
      .expect(200)
      .expect({ ok: true });
  });

  it("POST /webhooks/goto/calls?secret={correct} with STARTING event → 200 { ok: true } (ignored)", () => {
    return request(app.getHttpServer())
      .post(`/webhooks/goto/calls?secret=${WEBHOOK_SECRET}`)
      .send({ eventType: "STARTING" })
      .expect(200)
      .expect({ ok: true });
  });

  it("POST /webhooks/goto/calls?secret={correct} with REPORT_SUMMARY → 200", () => {
    return request(app.getHttpServer())
      .post(`/webhooks/goto/calls?secret=${WEBHOOK_SECRET}`)
      .send({
        eventType: "REPORT_SUMMARY",
        reportSummary: {
          conversationSpaceId: "e2e-call-space-001",
          accountKey: "acc-e2e",
          callCreated: cannedReport.callCreated,
          callEnded: cannedReport.callEnded,
        },
      })
      .expect(200)
      .expect((res: request.Response) => {
        expect(res.body.ok).toBe(true);
      });
  });
});
