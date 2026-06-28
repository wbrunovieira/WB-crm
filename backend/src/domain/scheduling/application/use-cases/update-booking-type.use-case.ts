import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { BookingTypesAdminRepository, UpdateBookingTypeData } from "../repositories/booking-types-admin.repository";
import { BookingTypesRepository, BookingTypeRecord } from "../repositories/booking-types.repository";
import { SchedulingAdminError } from "./create-booking-type.use-case";

@Injectable()
export class UpdateBookingTypeUseCase {
  constructor(
    private readonly repo: BookingTypesAdminRepository,
    private readonly read: BookingTypesRepository,
  ) {}

  async execute(input: { id: string; requesterId: string } & UpdateBookingTypeData): Promise<Either<SchedulingAdminError, { bookingType: BookingTypeRecord }>> {
    const { id, requesterId, ...data } = input;
    const existing = await this.read.findById(id);
    if (!existing) return left(new SchedulingAdminError("Tipo de agendamento não encontrado"));
    if (existing.ownerId !== requesterId) return left(new SchedulingAdminError("Não autorizado"));
    const bookingType = await this.repo.update(id, data);
    return right({ bookingType });
  }
}
