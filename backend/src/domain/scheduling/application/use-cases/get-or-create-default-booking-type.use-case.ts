import { Injectable } from "@nestjs/common";
import { Either, right } from "@/core/either";
import { BookingTypesAdminRepository } from "../repositories/booking-types-admin.repository";
import { BookingTypeRecord } from "../repositories/booking-types.repository";

/** Configuração padrão (editável depois no admin) — segue o combinado com o Bruno. */
const DEFAULT_WEEKLY = [
  { weekday: 1, start: "09:00", end: "18:00" },
  { weekday: 2, start: "09:00", end: "18:00" },
  { weekday: 3, start: "09:00", end: "18:00" },
  { weekday: 4, start: "09:00", end: "18:00" },
  { weekday: 5, start: "09:00", end: "18:00" },
  { weekday: 6, start: "08:00", end: "12:00" },
];

/**
 * Garante que o dono tenha um tipo de agendamento: retorna o primeiro ativo, ou
 * cria um padrão ("Reunião 30min") na primeira vez. Permite gerar link a partir
 * da página do lead sem configurar nada antes.
 */
@Injectable()
export class GetOrCreateDefaultBookingTypeUseCase {
  constructor(private readonly repo: BookingTypesAdminRepository) {}

  async execute(input: { ownerId: string }): Promise<Either<never, { bookingType: BookingTypeRecord }>> {
    const existing = await this.repo.listByOwner(input.ownerId);
    const active = existing.find((t) => t.active) ?? existing[0];
    if (active) return right({ bookingType: active });

    const bookingType = await this.repo.create({
      ownerId: input.ownerId,
      name: "Reunião 30min",
      slug: "reuniao-30min",
      durationMinutes: 30,
      bufferMinutes: 15,
      minNoticeHours: 4,
      maxAdvanceDays: 14,
      timeZone: "America/Sao_Paulo",
      weeklyHours: DEFAULT_WEEKLY,
      presentialCities: [],
      active: true,
    });
    return right({ bookingType });
  }
}
