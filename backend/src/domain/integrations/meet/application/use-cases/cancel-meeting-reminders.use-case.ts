import { Injectable } from "@nestjs/common";
import { Either, right } from "@/core/either";
import { ScheduledEmailsRepository } from "../repositories/scheduled-emails.repository";

@Injectable()
export class CancelMeetingRemindersUseCase {
  constructor(private readonly repo: ScheduledEmailsRepository) {}

  async execute(meetingId: string): Promise<Either<Error, void>> {
    await this.repo.cancelByMeetingId(meetingId);
    return right(undefined);
  }
}
