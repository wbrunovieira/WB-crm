import { describe, it, expect, beforeEach } from "vitest";
import { CreateBookingUseCase } from "@/domain/scheduling/application/use-cases/create-booking.use-case";
import { RescheduleBookingUseCase } from "@/domain/scheduling/application/use-cases/reschedule-booking.use-case";
import { CancelBookingUseCase } from "@/domain/scheduling/application/use-cases/cancel-booking.use-case";
import { BookingTypesRepository, BookingTypeRecord } from "@/domain/scheduling/application/repositories/booking-types.repository";
import { BookingLinksRepository, BookingLinkRecord } from "@/domain/scheduling/application/repositories/booking-links.repository";
import { CalendarFreeBusyPort } from "@/domain/scheduling/application/ports/calendar-freebusy.port";
import { SchedulingLeadsPort, BookingLead } from "@/domain/scheduling/application/ports/scheduling-leads.port";
import { MeetingSchedulerPort, ScheduleBookingInput, BookedMeetingRef } from "@/domain/scheduling/application/ports/meeting-scheduler.port";
import { TokenGeneratorPort } from "@/domain/scheduling/application/ports/token-generator.port";

const TZ = "America/Sao_Paulo";
const NOW = new Date("2026-07-01T15:00:00Z");          // quarta 12:00 BRT
const SLOT_ONLINE = "2026-07-01T19:00:00.000Z";        // quarta 16:00 BRT (livre, pós min-notice)
const SLOT_RESCHED = "2026-07-02T12:00:00.000Z";       // quinta 09:00 BRT (livre)
const SLOT_BAD = "2026-07-01T12:00:00.000Z";           // quarta 09:00 BRT (antes do min-notice)

const TYPE: BookingTypeRecord = {
  id: "bt1", ownerId: "owner1", name: "Reunião 30min", slug: "reuniao-30",
  durationMinutes: 30, bufferMinutes: 15, minNoticeHours: 4, maxAdvanceDays: 14, timeZone: TZ,
  weeklyHours: [
    { weekday: 1, start: "09:00", end: "18:00" }, { weekday: 2, start: "09:00", end: "18:00" },
    { weekday: 3, start: "09:00", end: "18:00" }, { weekday: 4, start: "09:00", end: "18:00" },
    { weekday: 5, start: "09:00", end: "18:00" }, { weekday: 6, start: "08:00", end: "12:00" },
  ],
  presentialCities: [{ city: "Teresópolis", state: "RJ" }], active: true,
};
const LEAD: BookingLead = { id: "lead1", name: "Padaria X", email: "x@x.com", city: "Teresópolis", state: "RJ", address: "Rua A, 100" };
const LINK: BookingLinkRecord = { id: "l1", token: "abc", ownerId: "owner1", bookingTypeId: "bt1", leadId: "lead1", contactId: null, label: null, active: true, expiresAt: null };

class FakeTypes extends BookingTypesRepository { async findById(id: string) { return id === TYPE.id ? TYPE : null; } }
class FakeLinks extends BookingLinksRepository {
  links = [LINK];
  async findByToken(t: string) { return this.links.find((l) => l.token === t) ?? null; }
  async findById(id: string) { return this.links.find((l) => l.id === id) ?? null; }
}
class FakeFreeBusy extends CalendarFreeBusyPort { async getBusy() { return []; } }
class FakeLeads extends SchedulingLeadsPort {
  lead: BookingLead | null = LEAD; // ajustável por teste (ex.: e-mail null)
  byContact: BookingLead | null = null;
  createdWith?: { ownerId: string; name: string; email?: string; whatsapp?: string };
  confirmedEmail?: string;
  async findForBooking(id: string) { return this.lead && this.lead.id === id ? this.lead : null; }
  async findByContact() { return this.byContact; }
  async createLead(input: { ownerId: string; name: string; email?: string; whatsapp?: string }) {
    this.createdWith = input;
    return { id: "newlead", name: input.name, email: input.email ?? null, city: null, state: null, address: null };
  }
  async confirmLeadEmail(_leadId: string, email: string) { this.confirmedEmail = email; }
}
const GENERIC_LINK: BookingLinkRecord = { id: "lg", token: "gen", ownerId: "owner1", bookingTypeId: "bt1", leadId: null, contactId: null, label: null, active: true, expiresAt: null };
class FakeTokens extends TokenGeneratorPort { generate() { return "manage-tok"; } }
class FakeScheduler extends MeetingSchedulerPort {
  meetings: (BookedMeetingRef & { manageToken: string; startAt: Date })[] = [];
  scheduled?: ScheduleBookingInput;
  rescheduledTo?: Date;
  cancelledId?: string;
  async schedule(input: ScheduleBookingInput) {
    this.scheduled = input;
    this.meetings.push({ meetingId: "m1", bookingLinkId: input.bookingLinkId, status: "scheduled", manageToken: input.manageToken, startAt: input.startAt });
    return { meetingId: "m1", meetLink: "https://meet.google.com/abc" };
  }
  async findByManageToken(t: string) { return this.meetings.find((m) => m.manageToken === t) ?? null; }
  async reschedule(_id: string, startAt: Date) { this.rescheduledTo = startAt; }
  async cancel(id: string) { this.cancelledId = id; const m = this.meetings.find((x) => x.meetingId === id); if (m) m.status = "cancelled"; }
}

let types: FakeTypes, links: FakeLinks, freebusy: FakeFreeBusy, leads: FakeLeads, sched: FakeScheduler, tokens: FakeTokens;
let create: CreateBookingUseCase, reschedule: RescheduleBookingUseCase, cancel: CancelBookingUseCase;
beforeEach(() => {
  types = new FakeTypes(); links = new FakeLinks(); freebusy = new FakeFreeBusy(); leads = new FakeLeads(); sched = new FakeScheduler(); tokens = new FakeTokens();
  create = new CreateBookingUseCase(links, types, freebusy, leads, sched, tokens);
  reschedule = new RescheduleBookingUseCase(links, types, freebusy, sched);
  cancel = new CancelBookingUseCase(sched);
});

describe("CreateBookingUseCase", () => {
  it("agenda online num slot livre, gera manageToken e chama o scheduler com o e-mail do lead", async () => {
    const r = await create.execute({ token: "abc", startISO: SLOT_ONLINE, mode: "online", now: NOW });
    expect(r.isRight()).toBe(true);
    if (r.isRight()) { expect(r.value.manageToken).toBe("manage-tok"); expect(r.value.meetLink).toContain("meet.google.com"); }
    expect(sched.scheduled?.attendeeEmail).toBe("x@x.com");
    expect(sched.scheduled?.leadId).toBe("lead1");
    expect(sched.scheduled?.location).toBeNull();         // online não tem endereço
    expect(sched.scheduled?.endAt.toISOString()).toBe("2026-07-01T19:30:00.000Z");
  });

  it("link por-lead: e-mail digitado tem prioridade e é salvo no lead", async () => {
    const r = await create.execute({ token: "abc", startISO: SLOT_ONLINE, mode: "online", attendeeEmail: "novo@x.com", now: NOW });
    expect(r.isRight()).toBe(true);
    expect(sched.scheduled?.attendeeEmail).toBe("novo@x.com");
    expect(leads.confirmedEmail).toBe("novo@x.com");
  });

  it("link por-lead sem e-mail no lead e sem digitar → left", async () => {
    leads.lead = { ...LEAD, email: null };
    const r = await create.execute({ token: "abc", startISO: SLOT_ONLINE, mode: "online", now: NOW });
    expect(r.isLeft()).toBe(true);
  });

  it("presencial usa o endereço do lead", async () => {
    const r = await create.execute({ token: "abc", startISO: SLOT_ONLINE, mode: "presential", now: NOW });
    expect(r.isRight()).toBe(true);
    expect(sched.scheduled?.mode).toBe("presential");
    expect(sched.scheduled?.location).toBe("Rua A, 100");
  });

  it("presencial: lead pode confirmar/alterar o endereço", async () => {
    const r = await create.execute({ token: "abc", startISO: SLOT_ONLINE, mode: "presential", address: "Rua Nova, 50 - Centro", now: NOW });
    expect(r.isRight()).toBe(true);
    expect(sched.scheduled?.location).toBe("Rua Nova, 50 - Centro");
  });

  it("recusa presencial em cidade não atendida", async () => {
    const leads2 = new FakeLeads();
    (leads2 as any).findForBooking = async () => ({ ...LEAD, city: "São Paulo" });
    const c = new CreateBookingUseCase(links, types, freebusy, leads2, sched, tokens);
    const r = await c.execute({ token: "abc", startISO: SLOT_ONLINE, mode: "presential", now: NOW });
    expect(r.isLeft()).toBe(true);
  });

  it("recusa slot indisponível (antes do min-notice)", async () => {
    const r = await create.execute({ token: "abc", startISO: SLOT_BAD, mode: "online", now: NOW });
    expect(r.isLeft()).toBe(true);
  });

  it("token inválido → left", async () => {
    const r = await create.execute({ token: "nope", startISO: SLOT_ONLINE, mode: "online", now: NOW });
    expect(r.isLeft()).toBe(true);
  });

  it("link genérico (sem lead): cria lead novo quando não existe", async () => {
    links.links.push(GENERIC_LINK);
    leads.byContact = null;
    const r = await create.execute({ token: "gen", startISO: SLOT_ONLINE, mode: "online", attendeeName: "Maria Souza", attendeeEmail: "maria@x.com", attendeeWhatsapp: "+5524999990000", now: NOW });
    expect(r.isRight()).toBe(true);
    expect(leads.createdWith?.email).toBe("maria@x.com");
    expect(leads.createdWith?.name).toBe("Maria Souza");
    expect(sched.scheduled?.leadId).toBe("newlead");
    expect(sched.scheduled?.attendeeEmail).toBe("maria@x.com");
  });

  it("link genérico: reusa lead existente por contato (não cria de novo)", async () => {
    links.links.push(GENERIC_LINK);
    leads.byContact = { id: "existing9", name: "Maria", email: "maria@x.com", city: null, state: null, address: null };
    const r = await create.execute({ token: "gen", startISO: SLOT_ONLINE, mode: "online", attendeeName: "Maria", attendeeEmail: "maria@x.com", now: NOW });
    expect(r.isRight()).toBe(true);
    expect(leads.createdWith).toBeUndefined();
    expect(sched.scheduled?.leadId).toBe("existing9");
  });

  it("link genérico sem nome/e-mail → left", async () => {
    links.links.push(GENERIC_LINK);
    const r = await create.execute({ token: "gen", startISO: SLOT_ONLINE, mode: "online", now: NOW });
    expect(r.isLeft()).toBe(true);
  });
});

describe("Reschedule/Cancel", () => {
  async function book() { await create.execute({ token: "abc", startISO: SLOT_ONLINE, mode: "online", now: NOW }); }

  it("remarca para outro slot livre", async () => {
    await book();
    const r = await reschedule.execute({ manageToken: "manage-tok", startISO: SLOT_RESCHED, now: NOW });
    expect(r.isRight()).toBe(true);
    expect(sched.rescheduledTo?.toISOString()).toBe(SLOT_RESCHED);
  });

  it("recusa remarcar para slot inválido", async () => {
    await book();
    const r = await reschedule.execute({ manageToken: "manage-tok", startISO: SLOT_BAD, now: NOW });
    expect(r.isLeft()).toBe(true);
  });

  it("cancela a reunião pelo manageToken", async () => {
    await book();
    const r = await cancel.execute({ manageToken: "manage-tok" });
    expect(r.isRight()).toBe(true);
    expect(sched.cancelledId).toBe("m1");
  });

  it("manageToken inexistente → left", async () => {
    const r = await cancel.execute({ manageToken: "nope" });
    expect(r.isLeft()).toBe(true);
  });
});
