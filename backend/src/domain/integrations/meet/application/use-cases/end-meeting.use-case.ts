import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { MeetingsRepository } from "../repositories/meetings.repository";
import { MeetingNotFoundError, MeetingForbiddenError } from "./meetings-crud.use-cases";

export interface EndMeetingInput {
  id: string;
  requesterId: string;
}

@Injectable()
export class EndMeetingUseCase {
  constructor(private readonly repo: MeetingsRepository) {}

  async execute(input: EndMeetingInput): Promise<Either<MeetingNotFoundError | MeetingForbiddenError, void>> {
    const meeting = await this.repo.findById(input.id);
    if (!meeting) return left(new MeetingNotFoundError("Reunião não encontrada"));
    if (meeting.ownerId !== input.requesterId) return left(new MeetingForbiddenError("Acesso negado"));

    const now = new Date();
    // Use scheduled end if it already passed; otherwise fallback to now
    const actualEndAt = meeting.endAt && meeting.endAt <= now ? meeting.endAt : now;
    const actualStartAt = meeting.startAt;

    await this.repo.markAsEnded(input.id, { actualStartAt, actualEndAt });
    return right(undefined);
  }
}
