import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "@/app.module";
import { PrismaService } from "@/infra/database/prisma.service";
import { JwtService } from "@nestjs/jwt";
import { PhoneValidatorPort } from "@/domain/integrations/phone/application/ports/phone-validator.port";

const OWNER = "e2e-pbatch-owner";
const FOREIGN = "e2e-pbatch-foreign";
const GROUP = "E2EPhoneBatch";
const MINE = "e2e-pbatch-mine";
const THEIRS = "e2e-pbatch-theirs";

const fakeValidator = { validate: () => ({ valid: true, type: "MOBILE", country: "BR" }) };

describe("POST /phone/verify/lead/batch — owner-scoped (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;

  beforeAll(async () => {
    const mod: TestingModule = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PhoneValidatorPort).useValue(fakeValidator)
      .compile();
    app = mod.createNestApplication();
    await app.init();
    prisma = mod.get(PrismaService);
    const jwt = mod.get(JwtService);

    await prisma.user.upsert({ where: { id: OWNER }, update: {}, create: { id: OWNER, email: "e2e-pbatch@test.com", name: "O", password: "h", role: "sdr" } });
    await prisma.user.upsert({ where: { id: FOREIGN }, update: {}, create: { id: FOREIGN, email: "e2e-pbatch-f@test.com", name: "F", password: "h", role: "sdr" } });
    await prisma.lead.upsert({ where: { id: MINE }, update: { sourceGroup: GROUP, phone: "+5511999998888" }, create: { id: MINE, businessName: "Mine", ownerId: OWNER, sourceGroup: GROUP, phone: "+5511999998888" } });
    await prisma.lead.upsert({ where: { id: THEIRS }, update: { sourceGroup: GROUP, phone: "+5511888887777" }, create: { id: THEIRS, businessName: "Theirs", ownerId: FOREIGN, sourceGroup: GROUP, phone: "+5511888887777" } });

    token = jwt.sign({ sub: OWNER, name: "O", email: "e2e-pbatch@test.com", role: "sdr" });
  });

  afterAll(async () => {
    await prisma.lead.deleteMany({ where: { id: { in: [MINE, THEIRS] } } });
    await prisma.user.deleteMany({ where: { id: { in: [OWNER, FOREIGN] } } });
    await app.close();
  });

  it("requires authentication", async () => {
    await request(app.getHttpServer()).post("/phone/verify/lead/batch").send({ sourceGroup: GROUP }).expect(401);
  });

  it("only verifies the requester's own leads", async () => {
    const res = await request(app.getHttpServer())
      .post("/phone/verify/lead/batch")
      .set("Authorization", `Bearer ${token}`)
      .send({ sourceGroup: GROUP })
      .expect(200);

    const done = JSON.parse(res.text.split("\n").find((l) => l.includes('"type":"done"'))!.replace(/^data: /, ""));
    expect(done.total).toBe(1);

    const foreign = await prisma.lead.findUnique({ where: { id: THEIRS } });
    expect(foreign?.phoneValid ?? null).toBeNull(); // foreign lead never validated
  });
});
