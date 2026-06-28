import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Test } from "@nestjs/testing";
import { INestApplication, Injectable } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "@/app.module";
import { PrismaService } from "@/infra/database/prisma.service";
import { CalendarFreeBusyPort } from "@/domain/scheduling/application/ports/calendar-freebusy.port";
import { MeetingSchedulerPort, ScheduleBookingInput, BookedMeetingRef } from "@/domain/scheduling/application/ports/meeting-scheduler.port";

// Fake do scheduler: grava a reunião no Prisma (sem tocar no Google), pra o fluxo
// de manageToken/reschedule/cancel funcionar de verdade.
@Injectable()
class FakeScheduler extends MeetingSchedulerPort {
  constructor(private readonly prisma: PrismaService) { super(); }
  async schedule(input: ScheduleBookingInput) {
    const m = await this.prisma.meeting.create({
      data: {
        title: input.title, startAt: input.startAt, endAt: input.endAt,
        attendeeEmails: JSON.stringify([input.attendeeEmail]),
        ownerId: input.ownerId, status: "scheduled",
        manageToken: input.manageToken, bookingLinkId: input.bookingLinkId,
        leadId: input.leadId ?? undefined,
        isPresential: input.mode === "presential",
        location: input.location ?? undefined,
      },
    });
    return { meetingId: m.id, meetLink: "https://meet.google.com/fake" };
  }
  async findByManageToken(t: string): Promise<BookedMeetingRef | null> {
    const m = await this.prisma.meeting.findFirst({ where: { manageToken: t }, select: { id: true, bookingLinkId: true, status: true } });
    return m ? { meetingId: m.id, bookingLinkId: m.bookingLinkId, status: m.status } : null;
  }
  async reschedule(id: string, startAt: Date, endAt: Date) { await this.prisma.meeting.update({ where: { id }, data: { startAt, endAt } }); }
  async cancel(id: string) { await this.prisma.meeting.update({ where: { id }, data: { status: "cancelled" } }); }
}

let app: INestApplication;
let prisma: PrismaService;
let ownerId: string, leadId: string, bookingTypeId: string;
const TOKEN = "e2e-sched-tok-001";
const EMAIL = "scheduling-e2e@test.com";

const WEEKLY = JSON.stringify([
  { weekday: 1, start: "09:00", end: "18:00" }, { weekday: 2, start: "09:00", end: "18:00" },
  { weekday: 3, start: "09:00", end: "18:00" }, { weekday: 4, start: "09:00", end: "18:00" },
  { weekday: 5, start: "09:00", end: "18:00" }, { weekday: 6, start: "08:00", end: "12:00" },
]);

async function cleanup() {
  await prisma.meeting.deleteMany({ where: { ownerId } });
  await prisma.bookingLink.deleteMany({ where: { token: TOKEN } });
  await prisma.bookingType.deleteMany({ where: { ownerId } });
  await prisma.lead.deleteMany({ where: { ownerId } });
}

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(CalendarFreeBusyPort).useValue({ getBusy: async () => [] })
    .overrideProvider(MeetingSchedulerPort).useClass(FakeScheduler)
    .compile();
  app = moduleRef.createNestApplication();
  await app.init();
  prisma = moduleRef.get(PrismaService);

  const user = await prisma.user.upsert({ where: { email: EMAIL }, update: {}, create: { email: EMAIL, name: "Sched E2E", password: "x", role: "admin" } });
  ownerId = user.id;
  await cleanup();
  const lead = await prisma.lead.create({ data: { businessName: "Padaria E2E", ownerId, email: "padaria@e2e.com", city: "Teresópolis", state: "RJ", address: "Rua A, 100" } });
  leadId = lead.id;
  const bt = await prisma.bookingType.create({ data: { ownerId, name: "Reunião 30min", slug: "e2e-30", weeklyHours: WEEKLY, presentialCities: JSON.stringify([{ city: "Teresópolis", state: "RJ" }]), active: true } });
  bookingTypeId = bt.id;
  await prisma.bookingLink.create({ data: { token: TOKEN, ownerId, bookingTypeId, leadId } });
});

afterAll(async () => { await cleanup(); await prisma.user.deleteMany({ where: { email: EMAIL } }); await app.close(); });

describe("Scheduling (e2e) — fluxo público de auto-agendamento", () => {
  let firstSlot: string;
  let secondSlot: string;
  let manageToken: string;

  it("GET /public/booking/:token retorna slots + online/presencial + endereço do lead", async () => {
    const res = await request(app.getHttpServer()).get(`/public/booking/${TOKEN}`).expect(200);
    expect(res.body.slots.length).toBeGreaterThan(1);
    expect(res.body.locationModes).toEqual(expect.arrayContaining(["online", "presential"]));
    expect(res.body.lead.name).toBe("Padaria E2E");
    expect(res.body.lead.address).toBe("Rua A, 100");
    firstSlot = res.body.slots[0].start;
    secondSlot = res.body.slots[1].start;
  });

  it("POST /public/booking/:token agenda e retorna manageToken + cria a reunião", async () => {
    const res = await request(app.getHttpServer()).post(`/public/booking/${TOKEN}`).send({ startISO: firstSlot, mode: "online" }).expect(201);
    expect(res.body.manageToken).toBeTruthy();
    manageToken = res.body.manageToken;
    const m = await prisma.meeting.findFirst({ where: { manageToken } });
    expect(m).toBeTruthy();
    expect(m!.leadId).toBe(leadId);
  });

  it("token inválido → 404", async () => {
    await request(app.getHttpServer()).get(`/public/booking/nope`).expect(404);
  });

  it("agendar slot inválido → 400", async () => {
    await request(app.getHttpServer()).post(`/public/booking/${TOKEN}`).send({ startISO: "2000-01-01T00:00:00.000Z", mode: "online" }).expect(400);
  });

  it("POST manage/:manageToken/reschedule remarca", async () => {
    await request(app.getHttpServer()).post(`/public/booking/manage/${manageToken}/reschedule`).send({ startISO: secondSlot }).expect(200);
    const m = await prisma.meeting.findFirst({ where: { manageToken } });
    expect(new Date(m!.startAt).toISOString()).toBe(secondSlot);
  });

  it("POST manage/:manageToken/cancel cancela", async () => {
    await request(app.getHttpServer()).post(`/public/booking/manage/${manageToken}/cancel`).expect(200);
    const m = await prisma.meeting.findFirst({ where: { manageToken } });
    expect(m!.status).toBe("cancelled");
  });
});
