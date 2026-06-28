import { describe, it, expect, beforeEach } from "vitest";
import { GetAvailableSlotsUseCase } from "@/domain/scheduling/application/use-cases/get-available-slots.use-case";
import { BookingTypesRepository, BookingTypeRecord } from "@/domain/scheduling/application/repositories/booking-types.repository";
import { BookingLinksRepository, BookingLinkRecord } from "@/domain/scheduling/application/repositories/booking-links.repository";
import { CalendarFreeBusyPort } from "@/domain/scheduling/application/ports/calendar-freebusy.port";
import { SchedulingLeadsPort, BookingLead } from "@/domain/scheduling/application/ports/scheduling-leads.port";
import { Interval } from "@/domain/scheduling/enterprise/services/availability.service";

const TZ = "America/Sao_Paulo";
const NOW = new Date("2026-07-01T15:00:00Z"); // quarta 12:00 BRT

const TYPE: BookingTypeRecord = {
  id: "bt1", ownerId: "owner1", name: "Reunião 30min", slug: "reuniao-30",
  durationMinutes: 30, bufferMinutes: 15, minNoticeHours: 4, maxAdvanceDays: 14,
  timeZone: TZ,
  weeklyHours: [
    { weekday: 1, start: "09:00", end: "18:00" }, { weekday: 2, start: "09:00", end: "18:00" },
    { weekday: 3, start: "09:00", end: "18:00" }, { weekday: 4, start: "09:00", end: "18:00" },
    { weekday: 5, start: "09:00", end: "18:00" }, { weekday: 6, start: "08:00", end: "12:00" },
  ],
  presentialCities: [{ city: "Teresópolis", state: "RJ" }],
  active: true,
};

class FakeTypes extends BookingTypesRepository {
  constructor(public type: BookingTypeRecord | null = TYPE) { super(); }
  async findById(id: string) { return this.type && this.type.id === id ? this.type : null; }
}
class FakeLinks extends BookingLinksRepository {
  public links: BookingLinkRecord[] = [];
  async findByToken(token: string) { return this.links.find((l) => l.token === token) ?? null; }
}
class FakeFreeBusy extends CalendarFreeBusyPort {
  constructor(public busy: Interval[] = []) { super(); }
  async getBusy() { return this.busy; }
}
class FakeLeads extends SchedulingLeadsPort {
  constructor(public lead: BookingLead | null) { super(); }
  async findForBooking(id: string) { return this.lead && this.lead.id === id ? this.lead : null; }
}

function link(over: Partial<BookingLinkRecord> = {}): BookingLinkRecord {
  return { id: "l1", token: "abc", ownerId: "owner1", bookingTypeId: "bt1", leadId: "lead1", contactId: null, label: null, active: true, expiresAt: null, ...over };
}
const LEAD_TERE: BookingLead = { id: "lead1", name: "Padaria X", email: "x@x.com", city: "Teresópolis", state: "RJ", address: "Rua A, 100" };

let types: FakeTypes, links: FakeLinks, freebusy: FakeFreeBusy, leads: FakeLeads, uc: GetAvailableSlotsUseCase;
function build(lead: BookingLead | null = LEAD_TERE, busy: Interval[] = []) {
  types = new FakeTypes(); links = new FakeLinks(); freebusy = new FakeFreeBusy(busy); leads = new FakeLeads(lead);
  uc = new GetAvailableSlotsUseCase(links, types, freebusy, leads);
}

describe("GetAvailableSlotsUseCase", () => {
  beforeEach(() => build());

  it("retorna slots livres + modos de local (online+presencial p/ cidade atendida)", async () => {
    links.links.push(link());
    const r = await uc.execute({ token: "abc", now: NOW });
    expect(r.isRight()).toBe(true);
    if (r.isRight()) {
      expect(r.value.slots.length).toBeGreaterThan(0);
      expect(r.value.locationModes).toEqual(expect.arrayContaining(["online", "presential"]));
      expect(r.value.lead?.name).toBe("Padaria X");
      expect(r.value.lead?.address).toBe("Rua A, 100");
      expect(r.value.bookingType.timeZone).toBe(TZ);
    }
  });

  it("cidade NÃO atendida presencialmente → só online", async () => {
    build({ ...LEAD_TERE, city: "São Paulo", state: "SP" });
    links.links.push(link());
    const r = await uc.execute({ token: "abc", now: NOW });
    expect(r.isRight() && r.value.locationModes).toEqual(["online"]);
  });

  it("link genérico (sem lead) → só online, lead null", async () => {
    build(null);
    links.links.push(link({ leadId: null }));
    const r = await uc.execute({ token: "abc", now: NOW });
    expect(r.isRight() && r.value.lead).toBeNull();
    expect(r.isRight() && r.value.locationModes).toEqual(["online"]);
  });

  it("token inexistente → left", async () => {
    const r = await uc.execute({ token: "nope", now: NOW });
    expect(r.isLeft()).toBe(true);
  });

  it("link inativo → left", async () => {
    links.links.push(link({ active: false }));
    const r = await uc.execute({ token: "abc", now: NOW });
    expect(r.isLeft()).toBe(true);
  });
});
