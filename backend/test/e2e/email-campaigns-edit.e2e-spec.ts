import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "@/app.module";
import { PrismaService } from "@/infra/database/prisma.service";
import { JwtService } from "@nestjs/jwt";

let app: INestApplication;
let prisma: PrismaService;
let token: string;
let otherToken: string;
let userId: string;
let otherUserId: string;

const OWNER_EMAIL = "campaign-edit-e2e@test.com";
const OTHER_EMAIL = "campaign-edit-other-e2e@test.com";

async function cleanup() {
  await prisma.emailCampaignStep.deleteMany({ where: { campaign: { ownerId: { in: [userId, otherUserId] } } } });
  await prisma.emailCampaign.deleteMany({ where: { ownerId: { in: [userId, otherUserId] } } });
}

beforeAll(async () => {
  const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = module.createNestApplication();
  await app.init();
  prisma = module.get(PrismaService);
  const jwt = module.get(JwtService);

  const user = await prisma.user.upsert({
    where: { email: OWNER_EMAIL },
    update: {},
    create: { email: OWNER_EMAIL, name: "Edit E2E", password: "hashed", role: "sdr" },
  });
  const other = await prisma.user.upsert({
    where: { email: OTHER_EMAIL },
    update: {},
    create: { email: OTHER_EMAIL, name: "Other E2E", password: "hashed", role: "sdr" },
  });
  userId = user.id;
  otherUserId = other.id;
  token = jwt.sign({ sub: user.id, name: user.name, email: user.email, role: user.role });
  otherToken = jwt.sign({ sub: other.id, name: other.name, email: other.email, role: other.role });
  await cleanup();
});

afterAll(async () => {
  await cleanup();
  await prisma.user.deleteMany({ where: { email: { in: [OWNER_EMAIL, OTHER_EMAIL] } } });
  await app.close();
});

const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

describe("Email campaigns — edit (e2e)", () => {
  it("edits the campaign name and the step subject/body, and lists steps", async () => {
    // create campaign
    const created = await request(app.getHttpServer())
      .post("/email-campaigns").set(auth(token))
      .send({ name: "Nome antigo", fromEmail: "bruno@wbdigitalsolutions.com" })
      .expect(201);
    const campaignId = created.body.id;
    expect(campaignId).toBeTruthy();

    // add a step
    await request(app.getHttpServer())
      .post(`/email-campaigns/${campaignId}/steps`).set(auth(token))
      .send({ order: 0, subject: "Assunto antigo", bodyHtml: "<p>antigo</p>", delayDays: 0 })
      .expect(201);

    // GET steps → get the step id
    const stepsRes = await request(app.getHttpServer())
      .get(`/email-campaigns/${campaignId}/steps`).set(auth(token))
      .expect(200);
    expect(stepsRes.body).toHaveLength(1);
    const stepId = stepsRes.body[0].id;
    expect(stepsRes.body[0].subject).toBe("Assunto antigo");

    // PATCH campaign name
    const patchCampaign = await request(app.getHttpServer())
      .patch(`/email-campaigns/${campaignId}`).set(auth(token))
      .send({ name: "Nome novo" })
      .expect(200);
    expect(patchCampaign.body.name).toBe("Nome novo");

    // PATCH step subject + body
    await request(app.getHttpServer())
      .patch(`/email-campaigns/${campaignId}/steps/${stepId}`).set(auth(token))
      .send({ subject: "Assunto novo", bodyHtml: "<p>novo</p>" })
      .expect(200);

    // verify persisted
    const after = await request(app.getHttpServer())
      .get(`/email-campaigns/${campaignId}/steps`).set(auth(token))
      .expect(200);
    expect(after.body[0].subject).toBe("Assunto novo");
    expect(after.body[0].bodyHtml).toBe("<p>novo</p>");

    const campaignRow = await prisma.emailCampaign.findUnique({ where: { id: campaignId } });
    expect(campaignRow!.name).toBe("Nome novo");
  });

  it("forbids editing a campaign owned by another user (403)", async () => {
    const created = await request(app.getHttpServer())
      .post("/email-campaigns").set(auth(token))
      .send({ name: "Do dono", fromEmail: "bruno@wbdigitalsolutions.com" })
      .expect(201);
    const campaignId = created.body.id;

    await request(app.getHttpServer())
      .patch(`/email-campaigns/${campaignId}`).set(auth(otherToken))
      .send({ name: "Invasor" })
      .expect(403);

    const row = await prisma.emailCampaign.findUnique({ where: { id: campaignId } });
    expect(row!.name).toBe("Do dono");
  });

  it("requires auth (401 without token)", async () => {
    await request(app.getHttpServer()).patch("/email-campaigns/whatever").send({ name: "x" }).expect(401);
  });
});
