import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "@/app.module";
import { PrismaService } from "@/infra/database/prisma.service";
import { JwtService } from "@nestjs/jwt";
import { EvolutionApiPort } from "@/domain/integrations/whatsapp/application/ports/evolution-api.port";

const OWNER = "e2e-wbatch-owner";
const FOREIGN = "e2e-wbatch-foreign";
const GROUP = "E2EWppBatch";
const MINE = "e2e-wbatch-mine";
const THEIRS = "e2e-wbatch-theirs";

const fakeEvolution = {
  sendText: async () => ({ messageId: "x", remoteJid: "x", timestamp: 0 }),
  sendMedia: async () => ({ messageId: "x", remoteJid: "x", timestamp: 0 }),
  sendAudio: async () => ({ messageId: "x", remoteJid: "x", timestamp: 0 }),
  downloadMedia: async () => ({ buffer: Buffer.from(""), mimeType: "audio/ogg", fileName: "a.ogg" }),
  checkNumber: async (phone: string) => ({ exists: true, number: phone, jid: `${phone}@s.whatsapp.net` }),
};

describe("POST /whatsapp/batch-check — owner-scoped (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;

  beforeAll(async () => {
    const mod: TestingModule = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(EvolutionApiPort).useValue(fakeEvolution)
      .compile();
    app = mod.createNestApplication();
    await app.init();
    prisma = mod.get(PrismaService);
    const jwt = mod.get(JwtService);

    await prisma.user.upsert({ where: { id: OWNER }, update: {}, create: { id: OWNER, email: "e2e-wbatch@test.com", name: "O", password: "h", role: "sdr" } });
    await prisma.user.upsert({ where: { id: FOREIGN }, update: {}, create: { id: FOREIGN, email: "e2e-wbatch-f@test.com", name: "F", password: "h", role: "sdr" } });
    await prisma.lead.upsert({ where: { id: MINE }, update: { sourceGroup: GROUP, phone: "+5511999998888" }, create: { id: MINE, businessName: "Mine", ownerId: OWNER, sourceGroup: GROUP, phone: "+5511999998888" } });
    await prisma.lead.upsert({ where: { id: THEIRS }, update: { sourceGroup: GROUP, phone: "+5511888887777" }, create: { id: THEIRS, businessName: "Theirs", ownerId: FOREIGN, sourceGroup: GROUP, phone: "+5511888887777" } });

    token = jwt.sign({ sub: OWNER, name: "O", email: "e2e-wbatch@test.com", role: "sdr" });
  });

  afterAll(async () => {
    await prisma.lead.deleteMany({ where: { id: { in: [MINE, THEIRS] } } });
    await prisma.user.deleteMany({ where: { id: { in: [OWNER, FOREIGN] } } });
    await app.close();
  });

  it("requires authentication", async () => {
    await request(app.getHttpServer()).post("/whatsapp/batch-check").send({ sourceGroup: GROUP }).expect(401);
  });

  it("only checks the requester's own leads", async () => {
    const res = await request(app.getHttpServer())
      .post("/whatsapp/batch-check")
      .set("Authorization", `Bearer ${token}`)
      .send({ sourceGroup: GROUP })
      .expect(200);

    const done = JSON.parse(res.text.split("\n").find((l) => l.includes('"type":"done"'))!.replace(/^data: /, ""));
    expect(done.total).toBe(1);

    const foreign = await prisma.lead.findUnique({ where: { id: THEIRS } });
    expect(foreign?.whatsappVerified).toBe(false); // default, never checked
  });
});
