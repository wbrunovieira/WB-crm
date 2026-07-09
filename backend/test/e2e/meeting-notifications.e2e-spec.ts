import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "@/app.module";
import { PrismaService } from "@/infra/database/prisma.service";
import { JwtService } from "@nestjs/jwt";
import {
  GoogleCalendarPort,
  CreateCalendarEventOptions,
} from "@/domain/integrations/meet/application/ports/google-calendar.port";
import { GmailPort } from "@/domain/integrations/email/application/ports/gmail.port";

// Certifies, deterministically, that scheduling a meeting: (1) makes Google create
// the event and invite the client (createMeetEvent with the client as attendee +
// sendUpdates "all"), and (2) sends the client the confirmation email. Fakes RECORD
// what the real Google/Gmail integrations would do — no real Google calls.

const CLIENT_EMAIL = "cliente-meet-notif-e2e@test.com";
const ORGANIZER = "bruno@wbdigitalsolutions.com";

class FakeCalendar extends GoogleCalendarPort {
  public created: CreateCalendarEventOptions[] = [];
  async getMeetEvent() { return null; }
  async createMeetEvent(opts: CreateCalendarEventOptions) {
    this.created.push(opts);
    return { googleEventId: "evt-notif-e2e", meetLink: "https://meet.google.com/notif-e2e", attendees: [] };
  }
  async cancelEvent() {}
  async updateEvent() {}
}

class FakeGmail extends GmailPort {
  public sends: Array<{ to: string; subject: string; bodyHtml: string }> = [];
  async send(params: { to: string; subject: string; bodyHtml: string }) {
    this.sends.push({ to: params.to, subject: params.subject, bodyHtml: params.bodyHtml });
    return { messageId: "m1", threadId: "t1" };
  }
  async pollHistory() { return []; }
  async getProfile() { return { emailAddress: "primary@wbdigitalsolutions.com", historyId: "1" }; }
  async getMessage() { return null; }
  async getSendAsAliases() { return []; }
  async sendCalendarInvite() {}
  async trashMessage() {}
}

let app: INestApplication;
let prisma: PrismaService;
let token: string;
let ownerId: string;
let partnerId: string;
const fakeCal = new FakeCalendar();
const fakeGmail = new FakeGmail();

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(GoogleCalendarPort).useValue(fakeCal)
    .overrideProvider(GmailPort).useValue(fakeGmail)
    .compile();
  app = moduleRef.createNestApplication();
  await app.init();
  prisma = moduleRef.get(PrismaService);
  const jwt = moduleRef.get(JwtService);

  const user = await prisma.user.upsert({
    where: { email: "e2e-meet-notif@test.com" },
    update: {},
    create: { email: "e2e-meet-notif@test.com", name: "Meet Notif E2E", password: "x", role: "admin" },
  });
  ownerId = user.id;
  token = jwt.sign({ sub: user.id, name: user.name, email: user.email, role: user.role });
  const partner = await prisma.partner.create({
    data: { name: "Partner Notif E2E", partnerType: "consultoria", ownerId },
  });
  partnerId = partner.id;
});

afterEach(() => {
  fakeCal.created.length = 0;
  fakeGmail.sends.length = 0;
});

afterAll(async () => {
  await prisma.meeting.deleteMany({ where: { ownerId } });
  await prisma.partner.deleteMany({ where: { ownerId } });
  await prisma.user.deleteMany({ where: { email: "e2e-meet-notif@test.com" } });
  await app?.close();
});

describe("Agendar reunião — Google cria o evento + cliente recebe (e2e)", () => {
  it("cria o evento no Google convidando o cliente e envia a confirmação ao cliente", async () => {
    const res = await request(app.getHttpServer())
      .post("/meetings")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Call com o cliente",
        startAt: "2026-07-20T17:00:00.000Z",
        endAt: "2026-07-20T17:30:00.000Z",
        attendeeEmails: [CLIENT_EMAIL],
        organizerEmail: ORGANIZER,
        partnerId,
        contactName: "Diego",
      })
      .expect(201);

    // Google criou a reunião: evento + Meet link, vinculado ao partner.
    expect(res.body.meetLink).toContain("meet.google.com");
    expect(res.body.partnerId).toBe(partnerId);

    // createMeetEvent chamado convidando o cliente, com notificação do Google ligada.
    expect(fakeCal.created).toHaveLength(1);
    expect(fakeCal.created[0].attendeeEmails).toContain(CLIENT_EMAIL);
    expect(fakeCal.created[0].sendUpdates).toBe("all"); // Google envia o convite ao cliente
    expect(new Date(fakeCal.created[0].startAt).toISOString()).toBe("2026-07-20T17:00:00.000Z");

    // Cliente recebe a confirmação por e-mail (cortesia via alias).
    const toClient = fakeGmail.sends.find((s) => s.to === CLIENT_EMAIL);
    expect(toClient).toBeTruthy();
    expect(toClient!.subject).toContain("Reunião");
  });
});
