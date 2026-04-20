import {
  EmailTrackingRepository,
  EmailTrackingRecord,
} from "@/domain/integrations/email/application/repositories/email-tracking.repository";

export interface TrackingEvent {
  type: "open" | "click";
  token: string;
  url?: string;
  userAgent?: string;
  ip?: string;
}

export class FakeEmailTrackingRepository extends EmailTrackingRepository {
  public items: EmailTrackingRecord[] = [];
  public events: TrackingEvent[] = [];

  async findByToken(token: string): Promise<EmailTrackingRecord | null> {
    return this.items.find((r) => r.token === token) ?? null;
  }

  async save(record: EmailTrackingRecord): Promise<void> {
    const idx = this.items.findIndex((r) => r.id === record.id);
    if (idx >= 0) {
      this.items[idx] = { ...record };
    } else {
      this.items.push({ ...record });
    }
  }

  async recordOpen(token: string, userAgent?: string, ip?: string): Promise<void> {
    this.events.push({ type: "open", token, userAgent, ip });
  }

  async recordClick(token: string, url: string, userAgent?: string, ip?: string): Promise<void> {
    this.events.push({ type: "click", token, url, userAgent, ip });
  }

  /** Helper: get all open events */
  getOpenEvents(): TrackingEvent[] {
    return this.events.filter((e) => e.type === "open");
  }

  /** Helper: get all click events */
  getClickEvents(): TrackingEvent[] {
    return this.events.filter((e) => e.type === "click");
  }
}
