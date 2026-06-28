import { describe, it, expect, beforeEach } from "vitest";
import { CreateBookingTypeUseCase } from "@/domain/scheduling/application/use-cases/create-booking-type.use-case";
import { UpdateBookingTypeUseCase } from "@/domain/scheduling/application/use-cases/update-booking-type.use-case";
import { ListBookingTypesUseCase } from "@/domain/scheduling/application/use-cases/list-booking-types.use-case";
import { GenerateBookingLinkUseCase } from "@/domain/scheduling/application/use-cases/generate-booking-link.use-case";
import { BookingTypesAdminRepository, CreateBookingTypeData, UpdateBookingTypeData } from "@/domain/scheduling/application/repositories/booking-types-admin.repository";
import { BookingTypesRepository, BookingTypeRecord } from "@/domain/scheduling/application/repositories/booking-types.repository";
import { BookingLinksAdminRepository, CreateBookingLinkData } from "@/domain/scheduling/application/repositories/booking-links-admin.repository";
import { BookingLinkRecord } from "@/domain/scheduling/application/repositories/booking-links.repository";
import { TokenGeneratorPort } from "@/domain/scheduling/application/ports/token-generator.port";

const WEEKLY = [{ weekday: 1, start: "09:00", end: "18:00" }, { weekday: 6, start: "08:00", end: "12:00" }];

class FakeAdminTypes extends BookingTypesAdminRepository {
  items: BookingTypeRecord[] = [];
  async create(d: CreateBookingTypeData) {
    const r: BookingTypeRecord = { id: "bt" + (this.items.length + 1), ...d };
    this.items.push(r); return r;
  }
  async update(id: string, d: UpdateBookingTypeData) {
    const r = this.items.find((x) => x.id === id)!; Object.assign(r, d); return r;
  }
  async listByOwner(ownerId: string) { return this.items.filter((x) => x.ownerId === ownerId); }
}
class FakeReadTypes extends BookingTypesRepository {
  constructor(private admin: FakeAdminTypes) { super(); }
  async findById(id: string) { return this.admin.items.find((x) => x.id === id) ?? null; }
}
class FakeAdminLinks extends BookingLinksAdminRepository {
  items: BookingLinkRecord[] = [];
  async create(d: CreateBookingLinkData) {
    const r: BookingLinkRecord = { id: "l1", token: d.token, ownerId: d.ownerId, bookingTypeId: d.bookingTypeId, leadId: d.leadId ?? null, contactId: d.contactId ?? null, label: d.label ?? null, active: true, expiresAt: null };
    this.items.push(r); return r;
  }
}
class FakeTokens extends TokenGeneratorPort { generate() { return "tok-123"; } }

let adminTypes: FakeAdminTypes, readTypes: FakeReadTypes, adminLinks: FakeAdminLinks, tokens: FakeTokens;
let createType: CreateBookingTypeUseCase, updateType: UpdateBookingTypeUseCase, listTypes: ListBookingTypesUseCase, genLink: GenerateBookingLinkUseCase;
beforeEach(() => {
  adminTypes = new FakeAdminTypes(); readTypes = new FakeReadTypes(adminTypes); adminLinks = new FakeAdminLinks(); tokens = new FakeTokens();
  createType = new CreateBookingTypeUseCase(adminTypes);
  updateType = new UpdateBookingTypeUseCase(adminTypes, readTypes);
  listTypes = new ListBookingTypesUseCase(adminTypes);
  genLink = new GenerateBookingLinkUseCase(adminLinks, readTypes, tokens);
});

describe("CreateBookingTypeUseCase", () => {
  it("cria com slug derivado do nome e defaults aplicados", async () => {
    const r = await createType.execute({ ownerId: "o1", name: "Reunião 30 min", weeklyHours: WEEKLY });
    expect(r.isRight()).toBe(true);
    if (r.isRight()) {
      expect(r.value.bookingType.slug).toBe("reuniao-30-min");
      expect(r.value.bookingType.durationMinutes).toBe(30);
      expect(r.value.bookingType.minNoticeHours).toBe(4);
      expect(r.value.bookingType.maxAdvanceDays).toBe(14);
      expect(r.value.bookingType.timeZone).toBe("America/Sao_Paulo");
      expect(r.value.bookingType.active).toBe(true);
    }
  });

  it("respeita overrides", async () => {
    const r = await createType.execute({ ownerId: "o1", name: "Demo", weeklyHours: WEEKLY, durationMinutes: 45, bufferMinutes: 10, minNoticeHours: 2, presentialCities: [{ city: "Teresópolis" }] });
    expect(r.isRight() && r.value.bookingType.durationMinutes).toBe(45);
    expect(r.isRight() && r.value.bookingType.presentialCities[0].city).toBe("Teresópolis");
  });

  it("nome vazio → left", async () => {
    const r = await createType.execute({ ownerId: "o1", name: "  ", weeklyHours: WEEKLY });
    expect(r.isLeft()).toBe(true);
  });
});

describe("GenerateBookingLinkUseCase", () => {
  async function seedType() { const r = await createType.execute({ ownerId: "o1", name: "Reunião", weeklyHours: WEEKLY }); return (r as any).value.bookingType.id as string; }

  it("gera link por lead com token e URL pública", async () => {
    const id = await seedType();
    const r = await genLink.execute({ ownerId: "o1", bookingTypeId: id, leadId: "lead9" });
    expect(r.isRight()).toBe(true);
    if (r.isRight()) {
      expect(r.value.token).toBe("tok-123");
      expect(r.value.link).toContain("/tok-123");
      expect(r.value.link).toContain("agenda.wbdigitalsolutions.com");
    }
    expect(adminLinks.items[0].leadId).toBe("lead9");
  });

  it("recusa tipo de outro dono", async () => {
    const id = await seedType();
    const r = await genLink.execute({ ownerId: "intruso", bookingTypeId: id, leadId: "lead9" });
    expect(r.isLeft()).toBe(true);
  });

  it("recusa tipo inexistente", async () => {
    const r = await genLink.execute({ ownerId: "o1", bookingTypeId: "nope" });
    expect(r.isLeft()).toBe(true);
  });
});

describe("List/Update", () => {
  it("lista os tipos do dono e atualiza", async () => {
    await createType.execute({ ownerId: "o1", name: "A", weeklyHours: WEEKLY });
    const list = await listTypes.execute({ ownerId: "o1" });
    expect(list.isRight() && list.value.bookingTypes.length).toBe(1);
    const id = (list as any).value.bookingTypes[0].id;
    const up = await updateType.execute({ id, requesterId: "o1", durationMinutes: 60, active: false });
    expect(up.isRight() && up.value.bookingType.durationMinutes).toBe(60);
    expect(up.isRight() && up.value.bookingType.active).toBe(false);
  });

  it("update de outro dono → left", async () => {
    const r = await createType.execute({ ownerId: "o1", name: "A", weeklyHours: WEEKLY });
    const id = (r as any).value.bookingType.id;
    const up = await updateType.execute({ id, requesterId: "intruso", durationMinutes: 60 });
    expect(up.isLeft()).toBe(true);
  });
});
