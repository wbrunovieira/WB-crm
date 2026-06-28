import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { MeetingSchedulerPort } from "../ports/meeting-scheduler.port";
import { BookingError } from "./slot-check.helper";

@Injectable()
export class CancelBookingUseCase {
  constructor(private readonly scheduler: MeetingSchedulerPort) {}

  async execute(input: { manageToken: string }): Promise<Either<BookingError, { meetingId: string }>> {
    const meeting = await this.scheduler.findByManageToken(input.manageToken);
    if (!meeting) return left(new BookingError("Agendamento não encontrado"));
    await this.scheduler.cancel(meeting.meetingId);
    return right({ meetingId: meeting.meetingId });
  }
}
