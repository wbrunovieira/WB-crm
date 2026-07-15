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
        partnerId: input.partnerId ?? undefined,
        isPresential: input.mode === "presential",
        location: input.location ?? undefined,
      },
    });
    return { meetingId: m.id, meetLink: "https://meet.google.com/fake" };
  }
  async findByManageToken(t: string): Promise<BookedMeetingRef | null> {
    const m = await this.prisma.meeting.findFirst({ where: { manageToken: t }, select: { id: true, bookingLinkId: true, status: true, startAt: true } });
    return m ? { meetingId: m.id, bookingLinkId: m.bookingLinkId, status: m.status, startAt: m.startAt } : null;
  }
  async reschedule(id: string, startAt: Date, endAt: Date) { await this.prisma.meeting.update({ where: { id }, data: { startAt, endAt } }); }
  async cancel(id: string) { await this.prisma.meeting.update({ where: { id }, data: { status: "cancelled" } }); }
}

let app: INestApplication;
let prisma: PrismaService;
let ownerId: string, leadId: string, bookingTypeId: string, partnerId: string;
const TOKEN = "e2e-sched-tok-001";
const PARTNER_TOKEN = "e2e-sched-prt-001";
const EMAIL = "scheduling-e2e@test.com";

const WEEKLY = JSON.stringify([
  { weekday: 1, start: "09:00", end: "18:00" }, { weekday: 2, start: "09:00", end: "18:00" },
  { weekday: 3, start: "09:00", end: "18:00" }, { weekday: 4, start: "09:00", end: "18:00" },
  { weekday: 5, start: "09:00", end: "18:00" }, { weekday: 6, start: "08:00", end: "12:00" },
]);

async function cleanup() {
  await prisma.meeting.deleteMany({ where: { ownerId } });
  await prisma.bookingLink.deleteMany({ where: { token: { in: [TOKEN, GEN_TOKEN, PARTNER_TOKEN] } } });
  await prisma.bookingType.deleteMany({ where: { ownerId } });
  await prisma.lead.deleteMany({ where: { ownerId } });
  await prisma.partner.deleteMany({ where: { ownerId } });
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
  const partner = await prisma.partner.create({ data: { name: "Agência E2E", partnerType: "outros", ownerId, email: "partner@e2e.com", city: "Teresópolis", state: "RJ", streetAddress: "Av. B, 200" } });
  partnerId = partner.id;
  await prisma.bookingLink.create({ data: { token: TOKEN, ownerId, bookingTypeId, leadId } });
  await prisma.bookingLink.create({ data: { token: GEN_TOKEN, ownerId, bookingTypeId, leadId: null, isDefaultPublic: true } });
  await prisma.bookingLink.create({ data: { token: PARTNER_TOKEN, ownerId, bookingTypeId, partnerId } });
});

const GEN_TOKEN = "e2e-sched-gen-001";
const INBOUND_EMAIL = "inbound-e2e@x.com";

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

  it("GET /public/booking (SEM token, URL /book) resolve o link público default", async () => {
    const res = await request(app.getHttpServer()).get(`/public/booking`).expect(200);
    expect(res.body.slots.length).toBeGreaterThan(0);
    expect(res.body.lead).toBeNull(); // link genérico → sem lead vinculado
  });

  it("POST /public/booking (SEM token) agenda pelo default e cria lead inbound", async () => {
    const notokenEmail = "inbound-notoken-e2e@x.com";
    const slots = await request(app.getHttpServer()).get(`/public/booking`).expect(200);
    const slot = slots.body.slots[0].start;
    const res = await request(app.getHttpServer()).post(`/public/booking`)
      .send({ startISO: slot, mode: "online", attendeeName: "Ana Notoken", attendeeEmail: notokenEmail })
      .expect(201);
    expect(res.body.manageToken).toBeTruthy();
    const lead = await prisma.lead.findFirst({ where: { ownerId, email: notokenEmail } });
    expect(lead).toBeTruthy(); // lead inbound criado pelo agendamento sem token
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

describe("Scheduling (e2e) — link genérico (sem lead)", () => {
  it("agenda informando contato e CRIA um lead inbound", async () => {
    const slotsRes = await request(app.getHttpServer()).get(`/public/booking/${GEN_TOKEN}`).expect(200);
    expect(slotsRes.body.lead).toBeNull();
    expect(slotsRes.body.locationModes).toEqual(["online"]);
    const slot = slotsRes.body.slots[0].start;

    const res = await request(app.getHttpServer()).post(`/public/booking/${GEN_TOKEN}`)
      .send({ startISO: slot, mode: "online", attendeeName: "Cliente Inbound", attendeeEmail: INBOUND_EMAIL, attendeeWhatsapp: "(24) 99999-0000" })
      .expect(201);
    expect(res.body.manageToken).toBeTruthy();

    const lead = await prisma.lead.findFirst({ where: { ownerId, email: INBOUND_EMAIL } });
    expect(lead).toBeTruthy();
    expect(lead!.businessName).toBe("Cliente Inbound");
    expect(lead!.isProspect).toBe(false);
    expect(lead!.whatsapp).toBe("+5524999990000"); // normalizado E.164

    const meeting = await prisma.meeting.findFirst({ where: { manageToken: res.body.manageToken } });
    expect(meeting!.leadId).toBe(lead!.id);
  });

  it("link genérico sem nome/e-mail → 400", async () => {
    const slotsRes = await request(app.getHttpServer()).get(`/public/booking/${GEN_TOKEN}`).expect(200);
    await request(app.getHttpServer()).post(`/public/booking/${GEN_TOKEN}`)
      .send({ startISO: slotsRes.body.slots[0].start, mode: "online" }).expect(400);
  });
});

describe("Scheduling (e2e) — link por-partner", () => {
  it("GET mostra o partner; POST agenda vinculado ao partner SEM criar lead", async () => {
    const slotsRes = await request(app.getHttpServer()).get(`/public/booking/${PARTNER_TOKEN}`).expect(200);
    expect(slotsRes.body.lead.name).toBe("Agência E2E");
    expect(slotsRes.body.lead.email).toBe("partner@e2e.com");
    expect(slotsRes.body.locationModes).toEqual(expect.arrayContaining(["online", "presential"]));
    const slot = slotsRes.body.slots[0].start;

    const leadsBefore = await prisma.lead.count({ where: { ownerId } });
    const res = await request(app.getHttpServer()).post(`/public/booking/${PARTNER_TOKEN}`)
      .send({ startISO: slot, mode: "online" }).expect(201);
    expect(res.body.manageToken).toBeTruthy();

    const meeting = await prisma.meeting.findFirst({ where: { manageToken: res.body.manageToken } });
    expect(meeting!.partnerId).toBe(partnerId);
    expect(meeting!.leadId).toBeNull();
    expect(JSON.parse(meeting!.attendeeEmails)).toContain("partner@e2e.com"); // convite vai pro e-mail do partner

    const leadsAfter = await prisma.lead.count({ where: { ownerId } });
    expect(leadsAfter).toBe(leadsBefore); // NÃO cria lead falso para o partner
  });

  it("link por-partner presencial usa o endereço do partner", async () => {
    const slotsRes = await request(app.getHttpServer()).get(`/public/booking/${PARTNER_TOKEN}`).expect(200);
    const res = await request(app.getHttpServer()).post(`/public/booking/${PARTNER_TOKEN}`)
      .send({ startISO: slotsRes.body.slots[0].start, mode: "presential" }).expect(201);
    const meeting = await prisma.meeting.findFirst({ where: { manageToken: res.body.manageToken } });
    expect(meeting!.location).toBe("Av. B, 200");
    expect(meeting!.partnerId).toBe(partnerId);
  });
});
