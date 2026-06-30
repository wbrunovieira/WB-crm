import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { BookingLinksRepository } from "../repositories/booking-links.repository";
import { BookingTypesRepository } from "../repositories/booking-types.repository";
import { CalendarFreeBusyPort } from "../ports/calendar-freebusy.port";
import { SchedulingLeadsPort } from "../ports/scheduling-leads.port";
import { MeetingSchedulerPort } from "../ports/meeting-scheduler.port";
import { TokenGeneratorPort } from "../ports/token-generator.port";
import { requestedSlotAvailable, BookingError } from "./slot-check.helper";
import { cityIsServed } from "../../enterprise/services/city-match";

export interface CreateBookingResult {
  manageToken: string;
  meetingId: string;
  meetLink: string | null;
  startAt: string;
  endAt: string;
  mode: "online" | "presential";
}

@Injectable()
export class CreateBookingUseCase {
  constructor(
    private readonly links: BookingLinksRepository,
    private readonly types: BookingTypesRepository,
    private readonly freebusy: CalendarFreeBusyPort,
    private readonly leads: SchedulingLeadsPort,
    private readonly scheduler: MeetingSchedulerPort,
    private readonly tokens: TokenGeneratorPort,
  ) {}

  async execute(input: {
    token: string;
    startISO: string;
    mode: "online" | "presential";
    attendeeName?: string;
    attendeeEmail?: string;
    attendeeWhatsapp?: string;
    address?: string; // endereço confirmado/alterado pelo lead (presencial)
    now?: Date;
  }): Promise<Either<BookingError, CreateBookingResult>> {
    const now = input.now ?? new Date();

    const link = await this.links.findByToken(input.token);
    if (!link || !link.active || (link.expiresAt && link.expiresAt < now)) {
      return left(new BookingError("Link de agendamento inválido ou expirado"));
    }
    const type = await this.types.findById(link.bookingTypeId);
    if (!type || !type.active) return left(new BookingError("Agendamento indisponível"));

    const startAt = new Date(input.startISO);
    if (isNaN(startAt.getTime())) return left(new BookingError("Horário inválido"));
    if (!(await requestedSlotAvailable(type, now, this.freebusy, link.ownerId, startAt))) {
      return left(new BookingError("Horário não está mais disponível"));
    }

    let lead = link.leadId ? await this.leads.findForBooking(link.leadId) : null;
    let resolvedLeadId: string | null = link.leadId;

    // Link genérico (sem lead): exige contato; acha lead existente por e-mail/WhatsApp ou cria um novo.
    if (!link.leadId) {
      const n = input.attendeeName?.trim();
      const em = input.attendeeEmail?.trim();
      const wa = input.attendeeWhatsapp?.trim();
      if (!n || !em) return left(new BookingError("Para agendar, informe seu nome e e-mail."));
      lead =
        (await this.leads.findByContact({ ownerId: link.ownerId, email: em, whatsapp: wa })) ??
        (await this.leads.createLead({ ownerId: link.ownerId, name: n, email: em, whatsapp: wa }));
      resolvedLeadId = lead.id;
    }

    // E-mail: o que o lead digitar tem prioridade (confirmação); cai pro do lead se já houver.
    const email = (input.attendeeEmail?.trim() || lead?.email || "").trim();
    // Nome da PESSOA que está agendando tem prioridade (o link pode ter sido aberto
    // por alguém cujo nome não temos); cai pro nome do lead se não vier.
    const name = (input.attendeeName?.trim() || lead?.name || "").trim();
    if (!email) return left(new BookingError("Informe seu e-mail para receber a confirmação."));
    // Link por-lead: salva e-mail/WhatsApp no lead se ele ainda não tinha (não sobrescreve).
    if (link.leadId) {
      await this.leads.confirmLeadEmail(link.leadId, email);
      if (input.attendeeWhatsapp?.trim()) await this.leads.confirmLeadWhatsapp(link.leadId, input.attendeeWhatsapp.trim());
    }

    let location: string | null = null;
    if (input.mode === "presential") {
      const served = cityIsServed(lead?.city, type.presentialCities);
      if (!served) return left(new BookingError("Atendimento presencial não disponível para esta cidade"));
      location = (input.address?.trim() || lead?.address) ?? null;
    }

    const endAt = new Date(startAt.getTime() + type.durationMinutes * 60_000);
    const manageToken = this.tokens.generate();

    const res = await this.scheduler.schedule({
      ownerId: link.ownerId,
      title: `Reunião: ${name || "Lead"}`,
      startAt,
      endAt,
      attendeeEmail: email,
      attendeeName: name || email,
      leadId: resolvedLeadId,
      contactId: link.contactId,
      mode: input.mode,
      location,
      manageToken,
      bookingLinkId: link.id,
    });

    return right({
      manageToken,
      meetingId: res.meetingId,
      meetLink: res.meetLink,
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
      mode: input.mode,
    });
  }
}
