import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "@/app.module";
import { PrismaService } from "@/infra/database/prisma.service";
import { JwtService } from "@nestjs/jwt";
import { MetaAdsCheckerPort } from "@/domain/integrations/meta-ads/application/ports/meta-ads-checker.port";

const OWNER = "e2e-mbatch-owner";
const FOREIGN = "e2e-mbatch-foreign";
const GROUP = "E2EMetaBatch";
const MINE = "e2e-mbatch-mine";
const THEIRS = "e2e-mbatch-theirs";

const fakeChecker = {
  check: async (handle: string) => ({ hasAds: true, activeCount: 1, checkedAt: new Date("2026-01-01T00:00:00Z"), searchTerm: handle }),
};

describe("POST /meta-ads/verify/lead/batch — owner-scoped (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;

  beforeAll(async () => {
    const mod: TestingModule = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MetaAdsCheckerPort).useValue(fakeChecker)
      .compile();
    app = mod.createNestApplication();
    await app.init();
    prisma = mod.get(PrismaService);
    const jwt = mod.get(JwtService);

    await prisma.user.upsert({ where: { id: OWNER }, update: {}, create: { id: OWNER, email: "e2e-mbatch@test.com", name: "O", password: "h", role: "sdr" } });
    await prisma.user.upsert({ where: { id: FOREIGN }, update: {}, create: { id: FOREIGN, email: "e2e-mbatch-f@test.com", name: "F", password: "h", role: "sdr" } });
    await prisma.lead.upsert({ where: { id: MINE }, update: { sourceGroup: GROUP, instagram: "@mine" }, create: { id: MINE, businessName: "Mine", ownerId: OWNER, sourceGroup: GROUP, instagram: "@mine" } });
    await prisma.lead.upsert({ where: { id: THEIRS }, update: { sourceGroup: GROUP, instagram: "@theirs" }, create: { id: THEIRS, businessName: "Theirs", ownerId: FOREIGN, sourceGroup: GROUP, instagram: "@theirs" } });

    token = jwt.sign({ sub: OWNER, name: "O", email: "e2e-mbatch@test.com", role: "sdr" });
  });

  afterAll(async () => {
    await prisma.lead.deleteMany({ where: { id: { in: [MINE, THEIRS] } } });
    await prisma.user.deleteMany({ where: { id: { in: [OWNER, FOREIGN] } } });
    await app.close();
  });

  it("requires authentication", async () => {
    await request(app.getHttpServer()).post("/meta-ads/verify/lead/batch").send({ sourceGroup: GROUP }).expect(401);
  });

  it("only checks the requester's own leads", async () => {
    const res = await request(app.getHttpServer())
      .post("/meta-ads/verify/lead/batch")
      .set("Authorization", `Bearer ${token}`)
      .send({ sourceGroup: GROUP })
      .expect(200);

    const done = JSON.parse(res.text.split("\n").find((l) => l.includes('"type":"done"'))!.replace(/^data: /, ""));
    expect(done.total).toBe(1);

    const foreign = await prisma.lead.findUnique({ where: { id: THEIRS } });
    expect(foreign?.metaAds ?? null).toBeNull(); // foreign lead never checked
  });
});
