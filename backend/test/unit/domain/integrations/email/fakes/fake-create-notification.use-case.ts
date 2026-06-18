import { right } from "@/core/either";

export interface RecordedNotification {
  type: string;
  title: string;
  summary: string;
  userId: string;
  payload?: string;
}

/** Stand-in for CreateNotificationUseCase that records calls instead of persisting/emitting. */
export class FakeCreateNotificationUseCase {
  calls: RecordedNotification[] = [];

  async execute(input: RecordedNotification) {
    this.calls.push(input);
    return right({} as never);
  }
}
