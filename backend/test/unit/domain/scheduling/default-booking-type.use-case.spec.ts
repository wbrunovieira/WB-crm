import { describe, it, expect } from "vitest";
import { GetOrCreateDefaultBookingTypeUseCase } from "@/domain/scheduling/application/use-cases/get-or-create-default-booking-type.use-case";
import { BookingTypesAdminRepository, CreateBookingTypeData, UpdateBookingTypeData } from "@/domain/scheduling/application/repositories/booking-types-admin.repository";
import { BookingTypeRecord } from "@/domain/scheduling/application/repositories/booking-types.repository";

class FakeAdmin extends BookingTypesAdminRepository {
  items: BookingTypeRecord[] = [];
  created = 0;
  async create(d: CreateBookingTypeData) { this.created++; const r: BookingTypeRecord = { id: "bt" + this.created, ...d }; this.items.push(r); return r; }
  async update(id: string, d: UpdateBookingTypeData) { const r = this.items.find((x) => x.id === id)!; Object.assign(r, d); return r; }
  async listByOwner(ownerId: string) { return this.items.filter((x) => x.ownerId === ownerId); }
}

describe("GetOrCreateDefaultBookingTypeUseCase", () => {
  it("cria um padrão na primeira vez (Reunião 30min, Sáb 08-12)", async () => {
    const repo = new FakeAdmin();
    const uc = new GetOrCreateDefaultBookingTypeUseCase(repo);
    const r = await uc.execute({ ownerId: "o1" });
    expect(r.isRight()).toBe(true);
    if (r.isRight()) {
      expect(r.value.bookingType.name).toBe("Reunião 30min");
      expect(r.value.bookingType.durationMinutes).toBe(30);
      expect(r.value.bookingType.weeklyHours.some((w) => w.weekday === 6 && w.start === "08:00")).toBe(true);
    }
    expect(repo.created).toBe(1);
  });

  it("reusa o existente (não cria de novo)", async () => {
    const repo = new FakeAdmin();
    const uc = new GetOrCreateDefaultBookingTypeUseCase(repo);
    await uc.execute({ ownerId: "o1" });
    const r2 = await uc.execute({ ownerId: "o1" });
    expect(repo.created).toBe(1);
    expect(r2.isRight() && r2.value.bookingType.id).toBe("bt1");
  });
});
