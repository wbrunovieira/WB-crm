import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "@/app.module";
import { PrismaService } from "@/infra/database/prisma.service";
import { JwtService } from "@nestjs/jwt";
import { ProcessActivityRemindersUseCase } from "@/domain/activities/application/use-cases/process-activity-reminders.use-case";

let app: INestApplication;
let prisma: PrismaService;
let token: string;
let userId: string;
let processReminders: ProcessActivityRemindersUseCase;

const EMAIL = "activity-reminders-e2e@test.com";

async function cleanup() {
  await prisma.notification.deleteMany({ where: { userId } });
  await prisma.activity.deleteMany({ where: { ownerId: userId } });
}

beforeAll(async () => {
  const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = module.createNestApplication();
  await app.init();
  prisma = module.get(PrismaService);
  processReminders = module.get(ProcessActivityRemindersUseCase);
  const jwt = module.get(JwtService);

  const user = await prisma.user.upsert({
    where: { email: EMAIL },
    update: {},
    create: { email: EMAIL, name: "Reminder E2E", password: "hashed", role: "sdr" },
  });
  userId = user.id;
  token = jwt.sign({ sub: user.id, name: user.name, email: user.email, role: user.role });
  await cleanup();
});

afterAll(async () => {
  await cleanup();
  await prisma.user.deleteMany({ where: { email: EMAIL } });
  await app.close();
});

function bearer() { return { Authorization: `Bearer ${token}` }; }

describe("Activity reminders (e2e)", () => {
  it("fires a bell notification for an activity whose remindAt is due, and only once", async () => {
    const past = new Date(Date.now() - 60_000).toISOString();

    const created = await request(app.getHttpServer())
      .post("/activities").set(bearer())
      .send({ type: "call", subject: "Ligar para a recepção (11h)", remindAt: past })
      .expect(201);
    const activityId = created.body.id;
    expect(created.body.remindAt).toBeTruthy();

    // Run the reminder pass (what the 1-min cron calls)
    const r = await processReminders.execute();
    expect(r.isRight()).toBe(true);

    // A notification was created for this owner, linked to the activity
    const notifs = await prisma.notification.findMany({ where: { userId, type: "ACTIVITY_REMINDER" } });
    const mine = notifs.find((n) => (n.payload ?? "").includes(activityId));
    expect(mine).toBeTruthy();
    expect(mine!.summary).toBe("Ligar para a recepção (11h)");

    // Activity is stamped remindedAt → does not fire again
    const row = await prisma.activity.findUnique({ where: { id: activityId } });
    expect(row!.remindedAt).not.toBeNull();

    await prisma.notification.deleteMany({ where: { userId, type: "ACTIVITY_REMINDER" } });
    await processReminders.execute();
    const again = await prisma.notification.findMany({ where: { userId, type: "ACTIVITY_REMINDER" } });
    expect(again.find((n) => (n.payload ?? "").includes(activityId))).toBeUndefined();
  });

  it("does NOT fire for a reminder set in the future", async () => {
    const future = new Date(Date.now() + 3_600_000).toISOString();
    const created = await request(app.getHttpServer())
      .post("/activities").set(bearer())
      .send({ type: "task", subject: "Lembrete futuro", remindAt: future })
      .expect(201);

    await processReminders.execute();

    const notifs = await prisma.notification.findMany({ where: { userId, type: "ACTIVITY_REMINDER" } });
    expect(notifs.find((n) => (n.payload ?? "").includes(created.body.id))).toBeUndefined();
  });
});
