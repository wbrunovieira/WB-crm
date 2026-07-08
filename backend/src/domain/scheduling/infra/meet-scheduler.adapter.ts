import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";
import {
  ScheduleMeetingUseCase, UpdateMeetingUseCase, CancelMeetingUseCase,
} from "@/domain/integrations/meet/application/use-cases/meetings-crud.use-cases";
import { MeetingSchedulerPort, ScheduleBookingInput, BookedMeetingRef } from "../application/ports/meeting-scheduler.port";

/**
 * Adapter que reusa o módulo `meet`: criar/remarcar/cancelar a reunião (evento
 * Google + Meet + confirmação por e-mail/iCal já saem do ScheduleMeetingUseCase).
 * Persiste manageToken/bookingLinkId direto via Prisma (camada infra).
 */
@Injectable()
export class MeetSchedulerAdapter extends MeetingSchedulerPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scheduleMeeting: ScheduleMeetingUseCase,
    private readonly updateMeeting: UpdateMeetingUseCase,
    private readonly cancelMeeting: CancelMeetingUseCase,
  ) { super(); }

  async schedule(input: ScheduleBookingInput): Promise<{ meetingId: string; meetLink: string | null }> {
    const res = await this.scheduleMeeting.execute({
      title: input.title,
      startAt: input.startAt,
      endAt: input.endAt,
      attendeeEmails: [input.attendeeEmail],
      organizerEmail: process.env.BOOKING_ORGANIZER_EMAIL,
      description: input.mode === "presential" && input.location ? `Reunião presencial — ${input.location}` : undefined,
      leadId: input.leadId ?? undefined,
      contactId: input.contactId ?? undefined,
      partnerId: input.partnerId ?? undefined,
      requesterId: input.ownerId,
      contactName: input.attendeeName,
      createActivity: true,
    });
    if (res.isLeft()) throw res.value;
    const m = res.value;

    await this.prisma.meeting.update({
      where: { id: m.id },
      data: {
        manageToken: input.manageToken,
        bookingLinkId: input.bookingLinkId,
        ...(input.mode === "presential" ? { isPresential: true, location: input.location ?? undefined } : {}),
      },
    });

    return { meetingId: m.id, meetLink: m.meetLink };
  }

  async findByManageToken(manageToken: string): Promise<BookedMeetingRef | null> {
    const m = await this.prisma.meeting.findFirst({
      where: { manageToken },
      select: { id: true, bookingLinkId: true, status: true, startAt: true },
    });
    return m ? { meetingId: m.id, bookingLinkId: m.bookingLinkId, status: m.status, startAt: m.startAt } : null;
  }

  async reschedule(meetingId: string, startAt: Date, endAt: Date): Promise<void> {
    const ownerId = await this.ownerOf(meetingId);
    const r = await this.updateMeeting.execute({ id: meetingId, requesterId: ownerId, startAt, endAt });
    if (r.isLeft()) throw r.value;
  }

  async cancel(meetingId: string): Promise<void> {
    const ownerId = await this.ownerOf(meetingId);
    const r = await this.cancelMeeting.execute({ id: meetingId, requesterId: ownerId });
    if (r.isLeft()) throw r.value;
  }

  private async ownerOf(meetingId: string): Promise<string> {
    const m = await this.prisma.meeting.findUnique({ where: { id: meetingId }, select: { ownerId: true } });
    if (!m) throw new Error("Reunião não encontrada");
    return m.ownerId;
  }
}
