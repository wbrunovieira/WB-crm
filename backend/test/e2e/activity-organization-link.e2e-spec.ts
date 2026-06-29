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
let userId: string;
let orgId: string;

const EMAIL = "activity-org-link-e2e@test.com";
const ORG_NAME = "Manon Ruivo E2E";

async function cleanup() {
  await prisma.activity.deleteMany({ where: { ownerId: userId } });
  await prisma.organization.deleteMany({ where: { ownerId: userId } });
}

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication();
  await app.init();
  prisma = moduleRef.get(PrismaService);
  const jwt = moduleRef.get(JwtService);

  const user = await prisma.user.upsert({
    where: { email: EMAIL },
    update: {},
    create: { email: EMAIL, name: "Org Link E2E", password: "x", role: "sdr" },
  });
  userId = user.id;
  token = jwt.sign({ sub: user.id, name: user.name, email: user.email, role: user.role });
  await cleanup();
  const org = await prisma.organization.create({ data: { name: ORG_NAME, ownerId: userId } });
  orgId = org.id;
});

afterAll(async () => {
  await cleanup();
  await prisma.user.deleteMany({ where: { email: EMAIL } });
  await app.close();
});

const bearer = () => ({ Authorization: `Bearer ${token}` });

describe("Activity ↔ Organization link (e2e)", () => {
  let activityId: string;

  it("cria atividade vinculada a uma organização (sem deal/contato/lead)", async () => {
    const res = await request(app.getHttpServer())
      .post("/activities").set(bearer())
      .send({ type: "whatsapp", subject: "vender Salto", organizationId: orgId })
      .expect(201);
    activityId = res.body.id;
    expect(activityId).toBeTruthy();
  });

  it("GET /activities/:id traz a organização vinculada (detalhe)", async () => {
    const res = await request(app.getHttpServer()).get(`/activities/${activityId}`).set(bearer()).expect(200);
    expect(res.body.organization).toBeTruthy();
    expect(res.body.organization.id).toBe(orgId);
    expect(res.body.organization.name).toBe(ORG_NAME);
  });

  it("GET /activities mostra a organização no item (lista/card)", async () => {
    const res = await request(app.getHttpServer()).get("/activities").set(bearer()).expect(200);
    const item = (res.body as Array<{ id: string; organization?: { name: string } | null }>).find((a) => a.id === activityId);
    expect(item).toBeTruthy();
    expect(item?.organization?.name).toBe(ORG_NAME);
  });
});
