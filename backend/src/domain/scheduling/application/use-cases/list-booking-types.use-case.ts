import { Injectable } from "@nestjs/common";
import { Either, right } from "@/core/either";
import { BookingTypesAdminRepository } from "../repositories/booking-types-admin.repository";
import { BookingTypeRecord } from "../repositories/booking-types.repository";

@Injectable()
export class ListBookingTypesUseCase {
  constructor(private readonly repo: BookingTypesAdminRepository) {}
  async execute(input: { ownerId: string }): Promise<Either<never, { bookingTypes: BookingTypeRecord[] }>> {
    const bookingTypes = await this.repo.listByOwner(input.ownerId);
    return right({ bookingTypes });
  }
}
