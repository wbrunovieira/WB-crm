import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "@/app.module";
import { EvolutionApiPort } from "@/domain/integrations/whatsapp/application/ports/evolution-api.port";
import { PhoneMatcherService } from "@/infra/shared/phone-matcher/phone-matcher.service";

const WEBHOOK_SECRET = "e2e-test-secret";
const OWNER_ID = "e2e-owner-001";

const fakeEvolutionApi = {
  sendText: async () => ({ messageId: "e2e-msg-001", remoteJid: "5511@s.whatsapp.net", timestamp: Date.now() }),
  sendMedia: async () => ({ messageId: "e2e-media-001", remoteJid: "5511@s.whatsapp.net", timestamp: Date.now() }),
  downloadMedia: async () => ({ buffer: Buffer.from(""), mimeType: "audio/ogg", fileName: "audio.ogg" }),
  checkNumber: async (phone: string) => ({ exists: true, jid: `${phone}@s.whatsapp.net`, number: phone }),
};

const fakePhoneMatcher = {
  match: async (_phone: string, _ownerId: string) => null, // no match → ignored
};

describe("WhatsApp Webhook (e2e)", () => {
  let app: INestApplication;

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
  });

  afterAll(async () => {
    await app.close();
  });

  it("POST /webhooks/whatsapp without X-Webhook-Secret → 401", () => {
    return request(app.getHttpServer())
      .post("/webhooks/whatsapp")
      .send({ event: "messages.upsert" })
      .expect(401);
  });

  it("POST /webhooks/whatsapp with wrong secret → 401", () => {
    return request(app.getHttpServer())
      .post("/webhooks/whatsapp")
      .set("x-webhook-secret", "wrong-secret")
      .send({ event: "messages.upsert" })
      .expect(401);
  });

  it("POST /webhooks/whatsapp with correct secret + non-messages.upsert event → 200 { ok: true } (ignored)", () => {
    return request(app.getHttpServer())
      .post("/webhooks/whatsapp")
      .set("x-webhook-secret", WEBHOOK_SECRET)
      .send({ event: "messages.update", data: {} })
      .expect(200)
      .expect({ ok: true });
  });

  it("POST /webhooks/whatsapp with correct secret + group JID → 200 { ok: true } (ignored)", () => {
    return request(app.getHttpServer())
      .post("/webhooks/whatsapp")
      .set("x-webhook-secret", WEBHOOK_SECRET)
      .send({
        event: "messages.upsert",
        data: {
          key: {
            id: "msg-group-001",
            fromMe: false,
            remoteJid: "120363000000000@g.us",
          },
          messageType: "conversation",
          messageTimestamp: Math.floor(Date.now() / 1000),
        },
      })
      .expect(200)
      .expect({ ok: true });
  });

  it("POST /webhooks/whatsapp with correct secret + individual message → 200 { ok: true }", () => {
    return request(app.getHttpServer())
      .post("/webhooks/whatsapp")
      .set("x-webhook-secret", WEBHOOK_SECRET)
      .send({
        event: "messages.upsert",
        data: {
          key: {
            id: "msg-individual-001",
            fromMe: false,
            remoteJid: "5511999998888@s.whatsapp.net",
          },
          pushName: "João Teste",
          messageType: "conversation",
          message: { conversation: "Olá, tudo bem?" },
          messageTimestamp: Math.floor(Date.now() / 1000),
        },
      })
      .expect(200)
      .expect({ ok: true });
  });
});
