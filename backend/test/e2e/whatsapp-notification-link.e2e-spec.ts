import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "@/app.module";
import { PrismaService } from "@/infra/database/prisma.service";
import { EvolutionApiPort } from "@/domain/integrations/whatsapp/application/ports/evolution-api.port";
import { PhoneMatcherService } from "@/infra/shared/phone-matcher/phone-matcher.service";

const WEBHOOK_SECRET = "e2e-link-secret";
const OWNER_ID = "e2e-wa-link-owner";
const LEAD_ID = "e2e-wa-link-lead";
const PHONE = "5521988887777";
const JID = `${PHONE}@s.whatsapp.net`;
const MESSAGE_ID = "e2e-wa-link-msg-001";

const fakeEvolutionApi = {
  sendText: async () => ({ messageId: "x", remoteJid: JID, timestamp: Date.now() }),
  sendMedia: async () => ({ messageId: "x", remoteJid: JID, timestamp: Date.now() }),
  downloadMedia: async () => ({ buffer: Buffer.from(""), mimeType: "audio/ogg", fileName: "a.ogg" }),
  checkNumber: async (phone: string) => ({ exists: true, jid: `${phone}@s.whatsapp.net`, number: phone }),
};

// Phone matches a lead → notification should link to /leads/<id>
const fakePhoneMatcher = {
  match: async () => ({ entityType: "lead", leadId: LEAD_ID }),
};

describe("WhatsApp incoming message → clickable notification (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    process.env.EVOLUTION_WEBHOOK_SECRET = WEBHOOK_SECRET;
    process.env.EVOLUTION_DEFAULT_OWNER_ID = OWNER_ID;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(EvolutionApiPort)
      .useValue(fakeEvolutionApi)
      .overrideProvider(PhoneMatcherService)
      .useValue(fakePhoneMatcher)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = moduleFixture.get(PrismaService);

    // Seed owner + lead so the Activity/Notification FKs resolve
    await prisma.user.upsert({
      where: { id: OWNER_ID },
      update: {},
      create: { id: OWNER_ID, email: "e2e-wa-link@test.com", name: "E2E WA Link", password: "hashed", role: "sdr" },
    });
    await prisma.lead.upsert({
      where: { id: LEAD_ID },
      update: {},
      create: { id: LEAD_ID, businessName: "Lead E2E WA Link", ownerId: OWNER_ID },
    });
  });

  afterAll(async () => {
    // Cleanup (children first for FK safety)
    await prisma.notification.deleteMany({ where: { userId: OWNER_ID } });
    await prisma.whatsAppMessage.deleteMany({ where: { ownerId: OWNER_ID } }).catch(() => {});
    await prisma.activity.deleteMany({ where: { ownerId: OWNER_ID } });
    await prisma.lead.deleteMany({ where: { id: LEAD_ID } });
    await prisma.user.deleteMany({ where: { id: OWNER_ID } });
    await app.close();
  });

  it("creates a WHATSAPP_MESSAGE notification whose payload.link points to the matched lead page", async () => {
    await request(app.getHttpServer())
      .post("/webhooks/whatsapp")
      .set("x-webhook-secret", WEBHOOK_SECRET)
      .send({
        event: "messages.upsert",
        data: {
          key: { id: MESSAGE_ID, fromMe: false, remoteJid: JID },
          pushName: "Cliente E2E",
          messageType: "conversation",
          message: { conversation: "Olá, gostaria de um orçamento" },
          messageTimestamp: Math.floor(Date.now() / 1000),
        },
      })
      .expect(200)
      .expect({ ok: true });

    // Processing is awaited inside the request → notification exists now
    const notifications = await prisma.notification.findMany({
      where: { userId: OWNER_ID, type: "WHATSAPP_MESSAGE" },
    });

    const target = notifications.find((n) => {
      try {
        return JSON.parse(n.payload ?? "{}").messageId === MESSAGE_ID;
      } catch {
        return false;
      }
    });

    expect(target).toBeDefined();
    const payload = JSON.parse(target!.payload as string);
    expect(payload.link).toBe(`/leads/${LEAD_ID}`);
  });
});
