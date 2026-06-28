import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { BookingLinksAdminRepository } from "../repositories/booking-links-admin.repository";
import { BookingTypesRepository } from "../repositories/booking-types.repository";
import { TokenGeneratorPort } from "../ports/token-generator.port";
import { SchedulingAdminError } from "./create-booking-type.use-case";

@Injectable()
export class GenerateBookingLinkUseCase {
  constructor(
    private readonly links: BookingLinksAdminRepository,
    private readonly types: BookingTypesRepository,
    private readonly tokens: TokenGeneratorPort,
  ) {}

  async execute(input: { ownerId: string; bookingTypeId: string; leadId?: string | null; contactId?: string | null; label?: string | null }):
    Promise<Either<SchedulingAdminError, { token: string; link: string }>> {
    const type = await this.types.findById(input.bookingTypeId);
    if (!type) return left(new SchedulingAdminError("Tipo de agendamento não encontrado"));
    if (type.ownerId !== input.ownerId) return left(new SchedulingAdminError("Não autorizado"));

    const token = this.tokens.generate();
    await this.links.create({
      token, ownerId: input.ownerId, bookingTypeId: input.bookingTypeId,
      leadId: input.leadId ?? null, contactId: input.contactId ?? null, label: input.label ?? null,
    });
    const base = process.env.BOOKING_PUBLIC_BASE_URL ?? "https://agenda.wbdigitalsolutions.com/book";
    return right({ token, link: `${base}/${token}` });
  }
}
