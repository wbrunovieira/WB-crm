import { Injectable, Optional, Inject } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Either, left, right } from "@/core/either";
import { BookingCreatedEvent, BOOKING_CREATED_EVENT } from "../../enterprise/events/booking-created.event";
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
    @Optional() @Inject(EventEmitter2) private readonly events: EventEmitter2 | null = null,
  ) {}

  async execute(input: {
    token?: string;
    startISO: string;
    mode: "online" | "presential";
    attendeeName?: string;
    attendeeEmail?: string;
    attendeeWhatsapp?: string;
    address?: string; // endereço confirmado/alterado pelo lead (presencial)
    lang?: string; // idioma que o lead usou na página (pt|en|es|it) — p/ o e-mail
    tz?: string; // fuso do visitante — p/ mostrar o horário no e-mail dele
    now?: Date;
  }): Promise<Either<BookingError, CreateBookingResult>> {
    const now = input.now ?? new Date();

    // Empty token = the token-less /book URL → resolve the default public link.
    const link = input.token ? await this.links.findByToken(input.token) : await this.links.findDefaultPublic();
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

    // Link por-partner: resolve o partner (nome/e-mail/endereço próprios); NÃO cria lead.
    const partner = link.partnerId ? await this.leads.findPartnerForBooking(link.partnerId) : null;
    const resolvedPartnerId: string | null = link.partnerId;

    // Link genérico (sem lead E sem partner): exige contato, mas NÃO cria lead no CRM
    // (decisão do produto, por ora) — os dados do lead vão apenas nos e-mails de
    // confirmação (pro lead) e de aviso (pro host).
    if (!link.leadId && !link.partnerId) {
      const n = input.attendeeName?.trim();
      const em = input.attendeeEmail?.trim();
      if (!n || !em) return left(new BookingError("Para agendar, informe seu nome e e-mail."));
    }

    // Entidade-fonte (lead OU partner) para e-mail/nome/endereço.
    const entity = lead ?? partner;
    // E-mail: o que a pessoa digitar tem prioridade (confirmação); cai pro da entidade.
    const email = (input.attendeeEmail?.trim() || entity?.email || "").trim();
    // Nome da PESSOA que está agendando tem prioridade (o link pode ter sido aberto
    // por alguém cujo nome não temos); cai pro nome da entidade se não vier.
    const name = (input.attendeeName?.trim() || entity?.name || "").trim();
    if (!email) return left(new BookingError("Informe seu e-mail para receber a confirmação."));
    // Link por-lead: salva e-mail/WhatsApp no lead se ele ainda não tinha (não sobrescreve).
    if (link.leadId) {
      await this.leads.confirmLeadEmail(link.leadId, email);
      if (input.attendeeWhatsapp?.trim()) await this.leads.confirmLeadWhatsapp(link.leadId, input.attendeeWhatsapp.trim());
    }

    let location: string | null = null;
    if (input.mode === "presential") {
      const served = cityIsServed(entity?.city, type.presentialCities);
      if (!served) return left(new BookingError("Atendimento presencial não disponível para esta cidade"));
      location = (input.address?.trim() || entity?.address) ?? null;
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
      companyName: entity?.name ?? undefined, // lead.businessName / partner.name
      leadId: resolvedLeadId,
      contactId: link.contactId,
      partnerId: resolvedPartnerId,
      mode: input.mode,
      location,
      manageToken,
      bookingLinkId: link.id,
    });

    // Alert the host (link owner) — Google never emails the organizer, so without
    // this a booking is silent by email. Fire-and-forget; never fails the booking.
    try {
      this.events?.emit(
        BOOKING_CREATED_EVENT,
        new BookingCreatedEvent({
          ownerId: link.ownerId,
          attendeeName: name || email,
          attendeeEmail: email,
          attendeeWhatsapp: input.attendeeWhatsapp?.trim() || null,
          title: type.name,
          startAtISO: startAt.toISOString(),
          endAtISO: endAt.toISOString(),
          timeZone: type.timeZone,
          attendeeTimeZone: input.tz || type.timeZone,
          lang: input.lang || "pt",
          meetingId: res.meetingId,
          meetLink: res.meetLink,
          mode: input.mode,
          location,
        }),
      );
    } catch {
      // notification failure must never break the booking
    }

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
