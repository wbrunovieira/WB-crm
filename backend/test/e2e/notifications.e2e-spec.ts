import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "@/app.module";
import { PrismaService } from "@/infra/database/prisma.service";
import { JwtService } from "@nestjs/jwt";

let app: INestApplication;
let prisma: PrismaService;
let jwt: JwtService;
let token: string;
let ownerId: string;

beforeAll(async () => {
  const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = module.createNestApplication();
  await app.init();
  prisma = module.get(PrismaService);
  jwt = module.get(JwtService);

  const user = await prisma.user.upsert({
    where: { email: "e2e-notifications@test.com" },
    update: {},
    create: { email: "e2e-notifications@test.com", name: "E2E Notif User", password: "hashed", role: "sdr" },
  });
  ownerId = user.id;
  token = jwt.sign({ sub: user.id, name: user.name, email: user.email, role: user.role });
});

afterEach(async () => {
  await prisma.notification.deleteMany({ where: { userId: ownerId } });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: "e2e-notifications@test.com" } });
  await app.close();
});

async function createNotif(overrides: Record<string, any> = {}) {
  return prisma.notification.create({
    data: {
      type: "GENERIC",
      status: "completed",
      title: "Notificação teste",
      summary: "Resumo",
      userId: ownerId,
      ...overrides,
    },
  });
}

describe("GET /notifications (e2e)", () => {
  it("retorna 401 sem token", async () => {
    await request(app.getHttpServer()).get("/notifications").expect(401);
  });

  it("retorna lista vazia inicialmente", async () => {
    const res = await request(app.getHttpServer())
      .get("/notifications")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(res.body.notifications).toHaveLength(0);
    expect(res.body.unreadCount).toBe(0);
  });

  it("retorna notificações com unreadCount correto", async () => {
    await createNotif({ read: false });
    await createNotif({ read: true });

    const res = await request(app.getHttpServer())
      .get("/notifications")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.notifications).toHaveLength(2);
    expect(res.body.unreadCount).toBe(1);
  });

  it("filtra ?unread=true", async () => {
    await createNotif({ read: false });
    await createNotif({ read: true });

    const res = await request(app.getHttpServer())
      .get("/notifications?unread=true")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.notifications).toHaveLength(1);
    expect(res.body.notifications[0].read).toBe(false);
  });
});

describe("PATCH /notifications/read (e2e)", () => {
  it("retorna 401 sem token", async () => {
    await request(app.getHttpServer()).patch("/notifications/read").expect(401);
  });

  it("marca IDs específicos como lidos", async () => {
    const n1 = await createNotif({ read: false });
    const n2 = await createNotif({ read: false });

    await request(app.getHttpServer())
      .patch("/notifications/read")
      .set("Authorization", `Bearer ${token}`)
      .send({ ids: [n1.id] })
      .expect(200);

    const updated = await prisma.notification.findUnique({ where: { id: n1.id } });
    const untouched = await prisma.notification.findUnique({ where: { id: n2.id } });
    expect(updated!.read).toBe(true);
    expect(untouched!.read).toBe(false);
  });

  it("marca todas como lidas com all:true", async () => {
    await createNotif({ read: false });
    await createNotif({ read: false });

    await request(app.getHttpServer())
      .patch("/notifications/read")
      .set("Authorization", `Bearer ${token}`)
      .send({ all: true })
      .expect(200);

    const count = await prisma.notification.count({ where: { userId: ownerId, read: false } });
    expect(count).toBe(0);
  });
});
