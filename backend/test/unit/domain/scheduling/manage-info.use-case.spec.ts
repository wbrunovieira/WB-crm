import { describe, it, expect } from "vitest";
import { GetBookingManageInfoUseCase } from "@/domain/scheduling/application/use-cases/get-booking-manage-info.use-case";
import { MeetingSchedulerPort, BookedMeetingRef } from "@/domain/scheduling/application/ports/meeting-scheduler.port";
import { BookingLinksRepository, BookingLinkRecord } from "@/domain/scheduling/application/repositories/booking-links.repository";
import { BookingTypesRepository, BookingTypeRecord } from "@/domain/scheduling/application/repositories/booking-types.repository";
import { CalendarFreeBusyPort } from "@/domain/scheduling/application/ports/calendar-freebusy.port";

const NOW = new Date("2026-07-01T15:00:00Z");
const TYPE: BookingTypeRecord = {
  id: "bt1", ownerId: "o1", name: "Reunião 30min", slug: "r30", durationMinutes: 30, bufferMinutes: 15,
  minNoticeHours: 4, maxAdvanceDays: 14, timeZone: "America/Sao_Paulo",
  weeklyHours: [{ weekday: 3, start: "09:00", end: "18:00" }, { weekday: 4, start: "09:00", end: "18:00" }],
  presentialCities: [], active: true,
};
const LINK: BookingLinkRecord = { id: "l1", token: "abc", ownerId: "o1", bookingTypeId: "bt1", leadId: "lead1", contactId: null, partnerId: null, label: null, active: true, expiresAt: null };

function make(ref: BookedMeetingRef | null) {
  const scheduler = { findByManageToken: async () => ref } as unknown as MeetingSchedulerPort;
  const links = { findByToken: async () => null, findById: async () => LINK } as unknown as BookingLinksRepository;
  const types = { findById: async () => TYPE } as unknown as BookingTypesRepository;
  const freebusy = { getBusy: async () => [] } as unknown as CalendarFreeBusyPort;
  return new GetBookingManageInfoUseCase(scheduler, links, types, freebusy);
}

describe("GetBookingManageInfoUseCase", () => {
  it("retorna horário atual + slots para remarcar", async () => {
    const uc = make({ meetingId: "m1", bookingLinkId: "l1", status: "scheduled", startAt: new Date("2026-07-01T19:00:00Z") });
    const r = await uc.execute({ manageToken: "mng", now: NOW });
    expect(r.isRight()).toBe(true);
    if (r.isRight()) {
      expect(r.value.status).toBe("scheduled");
      expect(r.value.currentStartAt).toBe("2026-07-01T19:00:00.000Z");
      expect(r.value.bookingType?.name).toBe("Reunião 30min");
      expect(r.value.slots.length).toBeGreaterThan(0);
    }
  });

  it("cancelada → status cancelled, sem slots", async () => {
    const uc = make({ meetingId: "m1", bookingLinkId: "l1", status: "cancelled", startAt: new Date("2026-07-01T19:00:00Z") });
    const r = await uc.execute({ manageToken: "mng", now: NOW });
    expect(r.isRight() && r.value.status).toBe("cancelled");
    expect(r.isRight() && r.value.slots.length).toBe(0);
  });

  it("manageToken inexistente → left", async () => {
    const uc = make(null);
    const r = await uc.execute({ manageToken: "nope", now: NOW });
    expect(r.isLeft()).toBe(true);
  });
});
