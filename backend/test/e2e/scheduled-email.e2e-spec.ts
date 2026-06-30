import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "@/app.module";
import { PrismaService } from "@/infra/database/prisma.service";
import { JwtService } from "@nestjs/jwt";
import { GmailPort } from "@/domain/integrations/email/application/ports/gmail.port";
import { GoogleOAuthPort } from "@/domain/integrations/email/application/ports/google-oauth.port";

const fakeGmailPort = {
  send: async () => ({ messageId: "msg-sched-1", threadId: "thread-sched-1" }),
  pollHistory: async () => [],
  getProfile: async () => ({ emailAddress: "user@test.com", historyId: "1" }),
  getMessage: async () => null,
  getSendAsAliases: async () => [],
};
const fakeGoogleOAuthPort = {
  getValidToken: async () => "fake-token",
  storeTokens: async () => {},
};

let app: INestApplication;
let prisma: PrismaService;
let token: string;
let userId: string;

const FUTURE = "2027-01-15T09:00:00.000Z";

beforeAll(async () => {
  const module = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(GmailPort).useValue(fakeGmailPort)
    .overrideProvider(GoogleOAuthPort).useValue(fakeGoogleOAuthPort)
    .compile();

  app = module.createNestApplication();
  await app.init();

  prisma = module.get(PrismaService);
  const jwt = module.get(JwtService);

  const user = await prisma.user.upsert({
    where: { email: "scheduled-email-e2e@test.com" },
    update: {},
    create: { email: "scheduled-email-e2e@test.com", name: "Scheduled Email E2E", password: "hashed", role: "sdr" },
  });
  userId = user.id;
  token = jwt.sign({ sub: user.id, name: user.name, email: user.email, role: user.role });
});

beforeEach(async () => {
  // Self-clean at START (shared dev DB) so reruns don't collide.
  await prisma.scheduledEmailSend.deleteMany({ where: { ownerId: userId } });
  await prisma.activity.deleteMany({ where: { ownerId: userId } });
});

afterAll(async () => {
  await prisma.scheduledEmailSend.deleteMany({ where: { ownerId: userId } });
  await prisma.activity.deleteMany({ where: { ownerId: userId } });
  await app.close();
});

function schedule(body: Record<string, unknown>) {
  return request(app.getHttpServer())
    .post("/email/schedule")
    .set("Authorization", `Bearer ${token}`)
    .send({ to: "client@example.com", subject: "Proposta", bodyHtml: "<p>Olá</p>", scheduledSendAt: FUTURE, ...body });
}

describe("Scheduled email (e2e)", () => {
  it("schedules an email: pending record + pending activity", async () => {
    const res = await schedule({});
    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.scheduledEmailId).toBeTruthy();
    expect(res.body.activityId).toBeTruthy();

    const record = await prisma.scheduledEmailSend.findUnique({ where: { id: res.body.scheduledEmailId } });
    expect(record?.status).toBe("PENDING");
    expect(record?.activityId).toBe(res.body.activityId);

    const activity = await prisma.activity.findUnique({ where: { id: res.body.activityId } });
    expect(activity?.type).toBe("email");
    expect(activity?.completed).toBe(false);
    expect(activity?.scheduledSendAt?.toISOString()).toBe(FUTURE);
  });

  it("rejects a scheduledSendAt in the past", async () => {
    const res = await schedule({ scheduledSendAt: "2020-01-01T09:00:00.000Z" });
    expect(res.status).toBe(400);
  });

  it("interprets a naive scheduledSendAt as America/Sao_Paulo (UTC-3)", async () => {
    const res = await schedule({ scheduledSendAt: "2027-01-15T16:00:00" });
    expect(res.status).toBe(201);
    const record = await prisma.scheduledEmailSend.findUnique({ where: { id: res.body.scheduledEmailId } });
    // 16:00 São Paulo = 19:00 UTC
    expect(record?.scheduledSendAt.toISOString()).toBe("2027-01-15T19:00:00.000Z");
  });

  it("lists the user's pending scheduled emails", async () => {
    const res = await schedule({ subject: "Listável" });
    const list = await request(app.getHttpServer())
      .get("/email/scheduled")
      .set("Authorization", `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(list.body.items.some((i: { id: string }) => i.id === res.body.scheduledEmailId)).toBe(true);
  });

  it("sends now by activityId: record SENT + activity completed", async () => {
    const res = await schedule({});
    const activityId = res.body.activityId as string;

    const sendNow = await request(app.getHttpServer())
      .post(`/email/scheduled/by-activity/${activityId}/send-now`)
      .set("Authorization", `Bearer ${token}`);
    expect(sendNow.status).toBe(200);

    const record = await prisma.scheduledEmailSend.findUnique({ where: { id: res.body.scheduledEmailId } });
    expect(record?.status).toBe("SENT");
    expect(record?.sentMessageId).toBe("msg-sched-1");

    const activity = await prisma.activity.findUnique({ where: { id: activityId } });
    expect(activity?.completed).toBe(true);
    expect(activity?.scheduledSendAt).toBeNull();
  });

  it("cancels by activityId: record CANCELLED + activity skipped", async () => {
    const res = await schedule({});
    const activityId = res.body.activityId as string;

    const cancel = await request(app.getHttpServer())
      .delete(`/email/scheduled/by-activity/${activityId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(cancel.status).toBe(200);

    const record = await prisma.scheduledEmailSend.findUnique({ where: { id: res.body.scheduledEmailId } });
    expect(record?.status).toBe("CANCELLED");

    const activity = await prisma.activity.findUnique({ where: { id: activityId } });
    expect(activity?.skippedAt).not.toBeNull();
  });

  it("returns 404 sending now for an activity with no scheduled email", async () => {
    const res = await request(app.getHttpServer())
      .post(`/email/scheduled/by-activity/non-existent-activity/send-now`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});
