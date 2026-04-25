import {
  ScheduledEmailsRepository,
  ScheduledEmailRecord,
  CreateScheduledEmailInput,
} from "@/domain/integrations/meet/application/repositories/scheduled-emails.repository";

export class InMemoryScheduledEmailsRepository extends ScheduledEmailsRepository {
  public items: ScheduledEmailRecord[] = [];
  private nextId = 1;

  async createMany(inputs: CreateScheduledEmailInput[]): Promise<void> {
    for (const input of inputs) {
      this.items.push({
        id: `email-${this.nextId++}`,
        meetingId: input.meetingId,
        type: input.type,
        scheduledFor: input.scheduledFor,
        status: "pending",
        attempts: 0,
        sentAt: null,
        failReason: null,
        recipientEmail: input.recipientEmail,
        organizerEmail: input.organizerEmail ?? null,
        meetingTitle: input.meetingTitle,
        meetingStartAt: input.meetingStartAt,
        meetingEndAt: input.meetingEndAt ?? null,
        meetingDescription: input.meetingDescription ?? null,
        meetLink: input.meetLink ?? null,
        contactName: input.contactName ?? null,
        companyName: input.companyName ?? null,
        createdAt: new Date(),
      });
    }
  }

  async findDue(now: Date, limit = 50): Promise<ScheduledEmailRecord[]> {
    return this.items
      .filter((e) => e.status === "pending" && e.scheduledFor <= now)
      .slice(0, limit);
  }

  async markSent(id: string): Promise<void> {
    const item = this.items.find((e) => e.id === id);
    if (item) { item.status = "sent"; item.sentAt = new Date(); }
  }

  async markFailed(id: string, reason: string): Promise<void> {
    const item = this.items.find((e) => e.id === id);
    if (item) { item.status = "failed"; item.failReason = reason; item.attempts += 1; }
  }

  async cancelByMeetingId(meetingId: string): Promise<void> {
    this.items
      .filter((e) => e.meetingId === meetingId && e.status === "pending")
      .forEach((e) => { e.status = "cancelled"; });
  }
}
